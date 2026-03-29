#!/usr/bin/env python3
import os
import re
import json
import logging
import sys
from datetime import date, datetime, timedelta
from calendar import monthrange
from itertools import product
from typing import Any, Dict, List, Optional, Tuple, Union


try:
    import pymysql
except ImportError:  # fallback if pymysql is missing
    pymysql = None


# Python 3.7 added ``datetime.fromisoformat``. Provide a minimal fallback so the
# code continues to work on older interpreters where it is unavailable.
try:  # pragma: no cover - behaviour depends on Python version
    _fromisoformat = datetime.fromisoformat
except AttributeError:  # pragma: no cover - executed on Python < 3.7
    def _fromisoformat(value):
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
        raise ValueError(f"Invalid isoformat string: {value!r}")

STATE_FILE = os.path.join(os.path.expanduser("~"), ".local", "share", "slurmledger", "last_run.json")

JOB_STATE_MAP = {
    0: "PENDING",
    1: "RUNNING",
    2: "SUSPENDED",
    3: "COMPLETED",
    4: "CANCELLED",
    5: "FAILED",
    6: "TIMEOUT",
    7: "NODE_FAIL",
    8: "PREEMPTED",
    9: "BOOT_FAIL",
    10: "DEADLINE",
    11: "OUT_OF_MEMORY",
}


def _read_last_run():
    """Return the last processed end date from the state file."""
    try:
        with open(STATE_FILE) as fh:
            data = json.load(fh)
            return data.get("last_end")
    except (OSError, json.JSONDecodeError):
        return None


def _write_last_run(end_date):
    """Persist the last processed end date."""
    try:
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, "w") as fh:
            json.dump({"last_end": end_date}, fh)
    except OSError as e:
        logging.warning("Failed to write state file %s: %s", STATE_FILE, e)


def _find_slurm_conf(service_paths=None):
    """Return path to slurm.conf by inspecting slurmctld.service."""
    paths = service_paths or [
        "/usr/lib/systemd/system/slurmctld.service",
        "/lib/systemd/system/slurmctld.service",
        "/etc/systemd/system/slurmctld.service",
    ]
    for svc in paths:
        try:
            with open(svc) as fh:
                for line in fh:
                    line = line.strip()
                    if line.startswith("ConditionPathExists=") and line.endswith("slurm.conf"):
                        return line.split("=", 1)[1].strip()
        except OSError:
            continue
    return "/etc/slurm/slurm.conf"


# ---------------------------------------------------------------------------
# Module-level billing computation helpers (no DB connection required)
# ---------------------------------------------------------------------------

def apply_billing_rules(
    job: Dict[str, Any],
    rules: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Evaluate billing rules against a single job dict.

    Returns one of:
      {"charge": True, "discount_percent": 0}
      {"charge": False, "reason": "<rule name>"}
      {"charge": True, "discount_percent": <n>, "reason": "<rule name>"}

    This is a pure function — it does not require a database connection and
    can be unit-tested independently of :class:`SlurmDB`.
    """
    _OPERATORS = {
        "equals": lambda a, b: a == b,
        "not_equals": lambda a, b: a != b,
        "in": lambda a, b: a in b,
        "not_in": lambda a, b: a not in b,
        "less_than": lambda a, b: float(a) < float(b),
        "greater_than": lambda a, b: float(a) > float(b),
        "contains": lambda a, b: b in a,
    }

    for rule in rules:
        if not rule.get("enabled", True):
            continue

        cond = rule.get("condition", {})
        field = cond.get("field")
        operator = cond.get("operator")
        value = cond.get("value")
        values = cond.get("values")

        # Resolve the field value from the job dict.
        # The "elapsed_seconds" virtual field is derived from the elapsed key.
        if field == "elapsed_seconds":
            job_val = job.get("elapsed") or 0
        else:
            job_val = job.get(field, "")

        op_fn = _OPERATORS.get(operator)
        if op_fn is None:
            continue

        try:
            operand = values if operator in ("in", "not_in") else value
            matched = op_fn(job_val, operand)
        except (TypeError, ValueError):
            matched = False

        if not matched:
            continue

        # For no_charge rules with exclude_states: if the job's state is
        # one of the excluded states, the rule does not apply.
        exclude_states = rule.get("exclude_states", [])
        if exclude_states and job.get("state") in exclude_states:
            continue

        action = rule.get("action")
        rule_name = rule.get("name", rule.get("id", "unknown rule"))

        if action == "no_charge":
            return {"charge": False, "reason": rule_name}
        elif action == "discount":
            discount_percent = rule.get("discount_percent", 0)
            return {
                "charge": True,
                "discount_percent": discount_percent,
                "reason": rule_name,
            }
        elif action == "charge_requested_time":
            # Signal to the caller that the job should be billed at
            # requested time rather than actual elapsed time.  The job
            # record may not carry tres_req wall-time; the caller handles
            # the fallback.
            return {
                "charge": True,
                "discount_percent": 0,
                "use_requested_time": True,
                "reason": rule_name,
            }

    # No rule matched — normal charge.
    return {"charge": True, "discount_percent": 0}


def build_time_series(
    totals: Dict[str, Any],
) -> Tuple[List[Dict[str, float]], List[Dict[str, float]], List[Dict[str, float]]]:
    """Build daily, monthly, and yearly time-series lists from aggregated usage totals.

    This is a pure function — it does not require a database connection and
    can be unit-tested independently of :class:`SlurmDB`.
    """
    daily = [
        {
            'date': d,
            'core_hours': round(totals['daily'].get(d, 0.0), 2),
            'gpu_hours': round(totals.get('daily_gpu', {}).get(d, 0.0), 2),
        }
        for d in sorted(set(totals['daily']) | set(totals.get('daily_gpu', {})))
    ]
    monthly = [
        {
            'month': m,
            'core_hours': round(totals['monthly'].get(m, 0.0), 2),
            'gpu_hours': round(totals.get('monthly_gpu', {}).get(m, 0.0), 2),
        }
        for m in sorted(set(totals['monthly']) | set(totals.get('monthly_gpu', {})))
    ]
    yearly = [
        {
            'year': y,
            'core_hours': round(totals['yearly'].get(y, 0.0), 2),
            'gpu_hours': round(totals.get('yearly_gpu', {}).get(y, 0.0), 2),
        }
        for y in sorted(set(totals['yearly']) | set(totals.get('yearly_gpu', {})))
    ]
    return daily, monthly, yearly


def calculate_projected_revenue(
    start_dt: datetime,
    end_dt: datetime,
    cluster_cores: int,
    rates_cfg: Dict[str, Any],
) -> float:
    """Calculate projected full-utilisation revenue for the given period.

    Uses the per-month historical rates where available, falling back to
    ``defaultRate``.  This is a pure function — it does not require a database
    connection and can be unit-tested independently of :class:`SlurmDB`.
    """
    default_rate = rates_cfg.get('defaultRate', 0.01)
    historical = rates_cfg.get('historicalRates', {})
    start_date = start_dt.date()
    end_date = end_dt.date()
    current = date(start_date.year, start_date.month, 1)
    end_marker = date(end_date.year, end_date.month, 1)
    projected_revenue = 0.0
    while current <= end_marker:
        days_in_month = monthrange(current.year, current.month)[1]
        month_start = date(current.year, current.month, 1)
        month_end = date(current.year, current.month, days_in_month)
        overlap_start = max(month_start, start_date)
        overlap_end = min(month_end, end_date)
        if overlap_start <= overlap_end:
            days = (overlap_end - overlap_start).days + 1
            rate = historical.get(current.strftime('%Y-%m'), default_rate)
            projected_revenue += cluster_cores * 24 * days * rate
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return round(projected_revenue, 2)


class SlurmDB:
    """Simple wrapper around the Slurm accounting database."""

    def __init__(
        self,
        host=None,
        port=None,
        user=None,
        password=None,
        database=None,
        config_file=None,
        cluster=None,
        slurm_conf=None,
    ):
        slurm_conf_path = (
            slurm_conf
            or os.environ.get("SLURM_CONF")
            or _find_slurm_conf()
        )

        conf_path = (
            config_file
            or os.environ.get("SLURMDB_CONF")
            or os.path.join(os.path.dirname(slurm_conf_path), "slurmdbd.conf")
        )
        cfg = self._load_config(conf_path)

        self.host = host or os.environ.get("SLURMDB_HOST") or cfg.get("host", "localhost")
        self.port = int(port or os.environ.get("SLURMDB_PORT") or cfg.get("port", 3306))
        self.user = user or os.environ.get("SLURMDB_USER") or cfg.get("user", "slurm")
        self.password = password or os.environ.get("SLURMDB_PASS") or cfg.get("password", "")
        self.database = database or os.environ.get("SLURMDB_DB") or cfg.get("db", "slurm_acct_db")
        self._conn = None
        self._tres_map = None
        self._cpu_col = None
        self._config_file = conf_path
        self._slurm_conf = slurm_conf_path
        self.cluster = (
            cluster
            or os.environ.get("SLURM_CLUSTER")
            or self._load_cluster_name(self._slurm_conf)
        )
        self._cluster_resources = None

        self._validate_config()


    def _load_config(self, path):
        """Parse slurmdbd.conf for storage connection details."""
        cfg = {}
        if path and os.path.exists(path):
            try:
                with open(path) as fh:
                    for line in fh:
                        line = line.strip()
                        if not line or line.startswith('#') or '=' not in line:
                            continue
                        key, val = line.split('=', 1)
                        key = key.strip()
                        val = val.strip()
                        if key == 'StorageHost':
                            cfg['host'] = val
                        elif key == 'StoragePort':
                            try:
                                cfg['port'] = int(val)
                            except ValueError:
                                pass
                        elif key == 'StorageUser':
                            cfg['user'] = val
                        elif key == 'StoragePass':
                            cfg['password'] = val
                        elif key == 'StorageLoc':
                            cfg['db'] = val
            except OSError:
                pass
        return cfg

    _IDENT_RE = re.compile(r"^[A-Za-z0-9_]+$")
    _HOST_RE = re.compile(r"^[A-Za-z0-9_.-]+$")

    def _validate_config(self):
        """Validate configuration values to avoid injection."""
        if not self._HOST_RE.match(str(self.host)):
            raise ValueError("Invalid host")
        if not isinstance(self.port, int) or not (1 <= self.port <= 65535):
            raise ValueError("Invalid port")
        for attr in ("user", "database", "cluster"):
            val = getattr(self, attr)
            if val and not self._IDENT_RE.match(str(val)):
                raise ValueError(f"Invalid {attr}")

    _DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

    def _validate_time(self, value, name):
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str) and self._DATE_RE.match(value):
            # Convert YYYY-MM-DD strings to a UNIX timestamp so comparisons
            # against numeric time_start/time_end columns work correctly.
            try:
                dt = _fromisoformat(value)
                return int(dt.timestamp())
            except ValueError:
                pass
        raise ValueError(f"Invalid {name} format")

    def _to_datetime(self, value):
        """Convert various timestamp formats to :class:`datetime`."""
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value)
        if isinstance(value, str):
            return _fromisoformat(value)
        raise TypeError("Unsupported time format")

    def _load_cluster_name(self, conf_path):
        """Parse slurm.conf for the ClusterName."""
        if conf_path and os.path.exists(conf_path):
            try:
                with open(conf_path) as fh:
                    for line in fh:
                        line = line.strip()
                        if line.startswith('ClusterName') and '=' in line:
                            return line.split('=', 1)[1].strip()
            except OSError:
                pass
        return None

    def _expand_nodelist(self, expr):
        names = []
        for part in expr.split(','):
            m = re.match(r'(.*)\[(.*)\](.*)', part)
            if m:
                prefix, inner, suffix = m.groups()
                ranges = []
                for grp in inner.split(','):
                    if '-' in grp:
                        start, end = grp.split('-')
                        width = len(start)
                        ranges.append([
                            f"{int(i):0{width}d}" for i in range(int(start), int(end) + 1)
                        ])
                    else:
                        ranges.append([grp])
                for combo in product(*ranges):
                    names.append(prefix + ''.join(combo) + suffix)
            else:
                names.append(part)
        return names

    def _parse_slurm_conf(self, conf_path):
        totals = {"nodes": 0, "sockets": 0, "cores": 0, "threads": 0, "gres": {}}
        defaults = {}
        if not conf_path or not os.path.exists(conf_path):
            return totals
        try:
            with open(conf_path) as fh:
                for raw in fh:
                    line = raw.split('#', 1)[0].strip()
                    if not line:
                        continue
                    if line.startswith('NodeName='):
                        parts = re.split(r'\s+', line)
                        attrs = defaults.copy()
                        for part in parts:
                            if '=' in part:
                                k, v = part.split('=', 1)
                                attrs[k] = v
                        node_expr = attrs.get('NodeName')
                        if node_expr == 'DEFAULT':
                            defaults.update(attrs)
                            continue
                        nodes = self._expand_nodelist(node_expr)
                        num_nodes = len(nodes)
                        sockets = int(attrs.get('Sockets', defaults.get('Sockets', 1)))
                        cps = int(attrs.get('CoresPerSocket', defaults.get('CoresPerSocket', 1)))
                        tpc = int(attrs.get('ThreadsPerCore', defaults.get('ThreadsPerCore', 1)))
                        totals['nodes'] += num_nodes
                        totals['sockets'] += sockets * num_nodes
                        totals['cores'] += cps * sockets * num_nodes
                        totals['threads'] += tpc * cps * sockets * num_nodes
                        gres_val = attrs.get('Gres', defaults.get('Gres'))
                        if gres_val:
                            for gres in gres_val.split(','):
                                segs = gres.split(':')
                                name = segs[0]
                                try:
                                    count = float(segs[-1])
                                except ValueError:
                                    continue
                                totals['gres'][name] = totals['gres'].get(name, 0) + count * num_nodes
        except OSError:
            return totals
        return totals

    def cluster_resources(self):
        if self._cluster_resources is None:
            self._cluster_resources = self._parse_slurm_conf(self._slurm_conf)
        return self._cluster_resources

    def connect(self):
        if pymysql is None:
            raise RuntimeError("pymysql is required but not installed")
        if self._conn is None:
            self._conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                cursorclass=pymysql.cursors.DictCursor,
                connect_timeout=10,
                read_timeout=60,
            )
        if not self.cluster:
            with self._conn.cursor() as cur:
                cur.execute("SELECT name FROM cluster_table LIMIT 1")
                row = cur.fetchone()
                if row and 'name' in row:
                    self.cluster = row['name']

    def cursor(self):
        """Return a database cursor, connecting if needed."""
        self.connect()
        return self._conn.cursor()

    def close(self):
        """Close the database connection if open."""
        if self._conn is not None:
            try:
                self._conn.close()
            finally:
                self._conn = None

    # Context manager support -------------------------------------------------
    def __enter__(self):
        """Connect to the database when entering a context."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc, tb):
        """Ensure the connection is closed when leaving a context."""
        self.close()
        # Do not suppress exceptions
        return False

    def _parse_mem(self, mem_str):
        if not mem_str:
            return 0.0
        m = re.match(r"(\d+(?:\.\d+)?)([KMGTP])", str(mem_str))
        if not m:
            return 0.0
        val = float(m.group(1))
        unit = m.group(2).upper()
        factors = {
            "K": 1 / (1024.0 ** 2),  # KB to GB
            "M": 1 / 1024.0,         # MB to GB
            "G": 1.0,                # GB to GB
            "T": 1024.0,             # TB to GB
            "P": 1024.0 ** 2,        # PB to GB (future-proofing)
        }
        return val * factors.get(unit, 0.0)

    def _parse_tres(self, tres_str, key):
        if not tres_str:
            return 0
        for part in str(tres_str).split(','):
            if part.startswith(key + '='):
                try:
                    return float(part.split('=', 1)[1])
                except ValueError:
                    return 0
        return 0

    def _get_tres_map(self):
        if self._tres_map is None:
            self.connect()
            self._tres_map = {}
            for table in ("tres", "tres_table"):
                try:
                    with self._conn.cursor() as cur:
                        cur.execute(f"SELECT id, type, name FROM {table}")
                        for row in cur.fetchall():
                            t_type = row.get("type")
                            t_name = row.get("name")
                            if t_type == "gres":
                                name = f"{t_type}/{t_name}" if t_name else t_type
                            elif t_name:
                                name = f"{t_type}/{t_name}"
                            else:
                                name = t_type
                            self._tres_map[row["id"]] = name
                        break
                except Exception as e:
                    # Older Slurm databases might use a different table name
                    # or not support TRES at all. If a table is missing,
                    # fall back to the next option or return an empty map.
                    if not (
                        pymysql
                        and isinstance(e, pymysql.err.ProgrammingError)
                        and e.args
                        and e.args[0] == 1146
                    ):
                        raise
            # If both queries failed we leave the map empty.
        return self._tres_map

    def _tres_to_str(self, tres_str):
        if not tres_str:
            return ""
        tmap = self._get_tres_map()
        parts = []
        for part in str(tres_str).split(','):
            if '=' not in part:
                continue
            key, val = part.split('=', 1)
            try:
                name = tmap.get(int(key), key)
            except ValueError:
                name = key
            parts.append(f"{name}={val}")
        return ','.join(parts)

    def _state_to_str(self, state):
        try:
            return JOB_STATE_MAP[int(state)]
        except (TypeError, ValueError, KeyError):
            return state

    def fetch_usage_records(
        self,
        start_time,
        end_time,
        summary_only: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ):
        """Fetch raw job records from SlurmDBD.

        When *summary_only* is True only the columns needed for account-level
        aggregation are fetched (no job_name, tres_req) to reduce wire transfer
        on busy clusters.  *limit* and *offset* enable server-side pagination
        when fetching per-job detail data.
        """
        start_time = self._validate_time(start_time, "start_time")
        end_time = self._validate_time(end_time, "end_time")
        if isinstance(start_time, int) and isinstance(end_time, int) and start_time > end_time:
            raise ValueError("start_time must be before end_time")
        self.connect()
        with self._conn.cursor() as cur:
            job_table = f"{self.cluster}_job_table" if self.cluster else "job_table"
            assoc_table = f"{self.cluster}_assoc_table" if self.cluster else "assoc_table"

            # Determine which CPU column exists. Older Slurm installations
            # expose ``cpus_alloc`` while newer ones only provide ``cpus_req``.
            # Cache the result to avoid repeated SHOW COLUMNS round-trips.
            if self._cpu_col is None:
                cur.execute(f"SHOW COLUMNS FROM {job_table} LIKE %s", ('cpus_alloc',))
                self._cpu_col = 'cpus_alloc' if cur.fetchone() else 'cpus_req'
            cpu_col = self._cpu_col

            if summary_only:
                # Minimal column set — enough for account/GPU/core-hour aggregation.
                # Skipping job_name and tres_req avoids transferring large string
                # columns when only aggregate totals are needed.
                select_cols = (
                    f"j.id_job AS jobid, j.account, j.partition, "
                    f"a.user AS user_name, j.time_start, j.time_end, j.tres_alloc, "
                    f"j.{cpu_col} AS cpus_alloc, j.state"
                )
            else:
                job_name_col = "job_name"
                cur.execute(f"SHOW COLUMNS FROM {job_table} LIKE %s", (job_name_col,))
                if not cur.fetchone():
                    job_name_col = "name"
                select_cols = (
                    f"j.id_job AS jobid, j.{job_name_col} AS job_name, j.account, j.partition, "
                    f"a.user AS user_name, j.time_start, j.time_end, j.tres_req, j.tres_alloc, "
                    f"j.{cpu_col} AS cpus_alloc, j.state, j.timelimit"
                )

            query = (
                f"SELECT {select_cols} FROM {job_table} AS j "
                f"LEFT JOIN {assoc_table} AS a ON j.id_assoc = a.id_assoc "
                f"WHERE j.time_start >= %s AND j.time_end <= %s AND j.time_end > 0"
            )
            params: list = [start_time, end_time]

            if limit is not None:
                if not isinstance(limit, int) or limit < 1:
                    raise ValueError("limit must be a positive integer")
                query += " LIMIT %s"
                params.append(limit)
                if offset is not None:
                    if not isinstance(offset, int) or offset < 0:
                        raise ValueError("offset must be a non-negative integer")
                    query += " OFFSET %s"
                    params.append(offset)

            cur.execute(query, params)
            rows = cur.fetchall()
            for row in rows:
                if not summary_only:
                    row["tres_req"] = self._tres_to_str(row.get("tres_req"))
                row["tres_alloc"] = self._tres_to_str(row.get("tres_alloc"))
                row["state"] = self._state_to_str(row.get("state"))
            return rows

    def fetch_summary_aggregated(self, start_ts, end_ts):
        """Fetch pre-aggregated summary data using SQL GROUP BY.

        Returns account-level totals without pulling individual job rows into
        Python.  GPU hours cannot be derived purely in SQL (``tres_alloc`` is a
        serialised string), so per-account GPU aggregation is still done in
        Python but only over the compact summary columns.

        Returns a list of dicts with keys: account, job_count, core_hours,
        completed_jobs, failed_jobs, gpu_hours.
        """
        start_ts = self._validate_time(start_ts, "start_ts")
        end_ts = self._validate_time(end_ts, "end_ts")
        self.connect()
        with self._conn.cursor() as cur:
            job_table = f"{self.cluster}_job_table" if self.cluster else "job_table"

            if self._cpu_col is None:
                cur.execute(f"SHOW COLUMNS FROM {job_table} LIKE %s", ('cpus_alloc',))
                self._cpu_col = 'cpus_alloc' if cur.fetchone() else 'cpus_req'
            cpu_col = self._cpu_col

            # SQL handles core-hour totals and state breakdowns.
            # tres_alloc GPU extraction happens in a second pass over the
            # minimal column set (account + tres_alloc only).
            query = f"""
                SELECT
                    account,
                    COUNT(*) AS job_count,
                    SUM(GREATEST(time_end - time_start, 0) * {cpu_col} / 3600.0) AS core_hours,
                    SUM(CASE WHEN state = 3 THEN 1 ELSE 0 END) AS completed_jobs,
                    SUM(CASE WHEN state != 3 THEN 1 ELSE 0 END) AS failed_jobs
                FROM {job_table}
                WHERE time_start >= %s AND time_end <= %s AND time_end > 0
                GROUP BY account
            """
            cur.execute(query, (start_ts, end_ts))
            agg_rows = cur.fetchall()

            # Second pass: pull tres_alloc per account to compute GPU hours.
            gpu_query = f"""
                SELECT account, tres_alloc, GREATEST(time_end - time_start, 0) AS elapsed_secs
                FROM {job_table}
                WHERE time_start >= %s AND time_end <= %s AND time_end > 0
                  AND tres_alloc IS NOT NULL AND tres_alloc != ''
            """
            cur.execute(gpu_query, (start_ts, end_ts))
            gpu_rows = cur.fetchall()

        gpu_by_account: Dict[str, float] = {}
        for row in gpu_rows:
            acct = row.get("account") or "unknown"
            tres = row.get("tres_alloc") or ""
            elapsed_secs = float(row.get("elapsed_secs") or 0)
            gpus = self._parse_tres(tres, "gpu")
            if not gpus:
                gpus = self._parse_tres(tres, "gres/gpu")
            gpu_by_account[acct] = gpu_by_account.get(acct, 0.0) + gpus * elapsed_secs / 3600.0

        results = []
        for row in agg_rows:
            acct = row.get("account") or "unknown"
            results.append(
                {
                    "account": acct,
                    "job_count": int(row.get("job_count") or 0),
                    "core_hours": round(float(row.get("core_hours") or 0.0), 2),
                    "completed_jobs": int(row.get("completed_jobs") or 0),
                    "failed_jobs": int(row.get("failed_jobs") or 0),
                    "gpu_hours": round(gpu_by_account.get(acct, 0.0), 2),
                }
            )
        return results

    def aggregate_usage(self, start_time, end_time, summary_only: bool = False):
        """Aggregate usage metrics by account and time period.

        When *summary_only* is True the query fetches a reduced column set
        (no job_name/tres_req) so less data travels over the wire.  The
        per-job detail entries in the returned *agg* dict will be absent.
        """
        rows = self.fetch_usage_records(start_time, end_time, summary_only=summary_only)
        agg = {}
        totals = {
            'daily': {},
            'monthly': {},
            'yearly': {},
            'daily_gpu': {},
            'monthly_gpu': {},
            'yearly_gpu': {},
            'partitions': set(),
            'accounts': set(),
            'users': set(),
        }
        for row in rows:
            start = self._to_datetime(row['time_start'])
            end = self._to_datetime(row['time_end'] or row['time_start'])
            dur_hours = (end - start).total_seconds() / 3600.0
            day = start.strftime('%Y-%m-%d')
            month = start.strftime('%Y-%m')
            year = start.strftime('%Y')
            account = row.get('account') or 'unknown'
            user = row.get('user_name') or 'unknown'
            partition = row.get('partition') or 'unknown'
            job = str(row.get('jobid') or 'unknown')
            cpus = self._parse_tres(row.get('tres_alloc'), 'cpu')
            if not cpus:
                try:
                    cpus = float(row.get('cpus_alloc') or 0)
                except (TypeError, ValueError):
                    cpus = 0.0
            gpus = self._parse_tres(row.get('tres_alloc'), 'gpu')
            if not gpus:
                gpus = self._parse_tres(row.get('tres_alloc'), 'gres/gpu')

            totals['daily'][day] = totals['daily'].get(day, 0.0) + cpus * dur_hours
            totals['monthly'][month] = totals['monthly'].get(month, 0.0) + cpus * dur_hours
            totals['yearly'][year] = totals['yearly'].get(year, 0.0) + cpus * dur_hours
            totals['daily_gpu'][day] = totals['daily_gpu'].get(day, 0.0) + gpus * dur_hours
            totals['monthly_gpu'][month] = totals['monthly_gpu'].get(month, 0.0) + gpus * dur_hours
            totals['yearly_gpu'][year] = totals['yearly_gpu'].get(year, 0.0) + gpus * dur_hours
            totals['partitions'].add(partition)
            totals['accounts'].add(account)
            totals['users'].add(user)

            month_entry = agg.setdefault(month, {})
            acct_entry = month_entry.setdefault(
                account,
                {
                    'core_hours': 0.0,
                    'gpu_hours': 0.0,
                    'users': {},
                },
            )
            acct_entry['core_hours'] += cpus * dur_hours
            acct_entry['gpu_hours'] += gpus * dur_hours

            if not summary_only:
                # Per-user and per-job breakdowns are only built for the full
                # details view; skip them when only aggregate totals are needed.
                user_entry = acct_entry['users'].setdefault(
                    user, {'core_hours': 0.0, 'gpu_hours': 0.0, 'jobs': {}}
                )
                user_entry['core_hours'] += cpus * dur_hours
                user_entry['gpu_hours'] += gpus * dur_hours
                job_entry = user_entry['jobs'].setdefault(
                    job,
                    {
                        'core_hours': 0.0,
                        'gpu_hours': 0.0,
                        'job_name': row.get('job_name'),
                        'partition': partition,
                        'start': start.isoformat(),
                        'end': end.isoformat(),
                        'elapsed': int((end - start).total_seconds()),
                        'req_tres': row.get('tres_req'),
                        'alloc_tres': row.get('tres_alloc'),
                        'state': row.get('state'),
                        'timelimit': int(row.get('timelimit') or 0),
                    },
                )
                job_entry['core_hours'] += cpus * dur_hours
                job_entry['gpu_hours'] += gpus * dur_hours
        return agg, totals

    def fetch_all_accounts(self):
        """Return a sorted list of all accounts in the cluster."""
        self.connect()
        accounts = set()
        with self._conn.cursor() as cur:
            try:
                cur.execute("SHOW TABLES LIKE 'acct_table'")
                if cur.fetchone():
                    cur.execute("SELECT name FROM acct_table WHERE deleted = 0")
                    for row in cur.fetchall():
                        name = row.get('name')
                        if name:
                            accounts.add(name)
                    return sorted(accounts)
            except pymysql.err.ProgrammingError:
                pass

            assoc_table = (
                f"{self.cluster}_assoc_table" if self.cluster else "assoc_table"
            )
            try:
                cur.execute(
                    f"SELECT DISTINCT acct FROM {assoc_table} WHERE deleted = 0"
                )
                for row in cur.fetchall():
                    acct = row.get('acct')
                    if acct:
                        accounts.add(acct)
            except pymysql.err.ProgrammingError:
                pass
        return sorted(accounts)

    def fetch_invoices(self, start_date=None, end_date=None):
        """Fetch invoice metadata from the database if present."""
        if start_date:
            start_date = self._validate_time(start_date, "start_date")
        if end_date:
            end_date = self._validate_time(end_date, "end_date")
        self.connect()
        with self._conn.cursor() as cur:
            cur.execute("SHOW TABLES LIKE 'invoices'")
            if not cur.fetchone():
                return []

            if start_date and end_date:
                query = (
                    "SELECT file, invoice_date FROM invoices "
                    "WHERE invoice_date >= %s AND invoice_date <= %s"
                )
                cur.execute(query, (start_date, end_date))
            else:
                query = "SELECT file, invoice_date FROM invoices"
                cur.execute(query)
            rows = cur.fetchall()
        return [
            {
                'file': r.get('file'),
                'date': r.get('invoice_date'),
            }
            for r in rows
        ]

    def _compute_allocation_info(
        self,
        account: str,
        used_su: float,
        rates_cfg: Dict[str, Any],
        account_usage_by_month: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Return allocation tracking fields for *account*.

        Returns a dict with keys: budget_su, used_su, remaining_su,
        percent_used, alert_level.  When no allocation is configured for the
        account the budget_su fields are None.

        When *account_usage_by_month* is provided (a dict mapping YYYY-MM to
        account-level usage dicts with a 'core_hours' key) and the allocation
        has start_date/end_date set, used_su is re-computed to only include
        months that fall within the allocation's date boundaries.  This prevents
        the query period from inflating or deflating the allocation balance.
        """
        allocations = rates_cfg.get("allocations", {})
        alloc = allocations.get(account)
        if alloc is None:
            return {
                "budget_su": None,
                "used_su": round(used_su, 2),
                "remaining_su": None,
                "percent_used": None,
                "alert_level": None,
            }

        budget = alloc.get("budget_su")
        if budget is None:
            return {
                "budget_su": None,
                "used_su": round(used_su, 2),
                "remaining_su": None,
                "percent_used": None,
                "alert_level": None,
            }

        # If the allocation has explicit date bounds and per-month usage is
        # available, filter used_su to only count months within the allocation
        # period so that wide query windows do not misrepresent the balance.
        alloc_start_str = alloc.get("start_date")
        alloc_end_str = alloc.get("end_date")
        if account_usage_by_month and (alloc_start_str or alloc_end_str):
            try:
                alloc_start = _fromisoformat(alloc_start_str).date() if alloc_start_str else None
                alloc_end = _fromisoformat(alloc_end_str).date() if alloc_end_str else None
                scoped_su = 0.0
                for month_key, month_accounts in account_usage_by_month.items():
                    # month_key is YYYY-MM; compare its first day against bounds
                    try:
                        month_date = _fromisoformat(month_key + "-01").date()
                    except ValueError:
                        continue
                    if alloc_start and month_date < date(alloc_start.year, alloc_start.month, 1):
                        continue
                    if alloc_end and month_date > date(alloc_end.year, alloc_end.month, 1):
                        continue
                    acct_vals = month_accounts.get(account)
                    if acct_vals:
                        scoped_su += acct_vals.get("core_hours", 0.0)
                used_su = scoped_su
            except (ValueError, TypeError, AttributeError):
                pass  # fall back to the passed-in used_su

        # Carry-forward: if the allocation period has ended and carryover is
        # enabled, the admin can set carryover_su in the allocation config to
        # credit unused SUs from the prior period into the current budget.
        # Automatic calculation requires historical data not always available,
        # so the amount is set manually by the admin.
        carryover_active = False
        carryover_su = 0.0
        carryover_note = None
        if alloc.get("carryover"):
            today = date.today()
            if alloc_end_str:
                try:
                    alloc_end = _fromisoformat(alloc_end_str).date()
                    if today > alloc_end:
                        # Period has ended; apply any manually configured carryover
                        configured_carryover = alloc.get("carryover_su")
                        if configured_carryover is not None:
                            carryover_su = float(configured_carryover)
                            budget = budget + carryover_su
                            carryover_active = True
                            carryover_note = (
                                f"Carry-forward of {carryover_su:,.0f} SU applied "
                                f"from period ending {alloc_end_str}"
                            )
                except (ValueError, TypeError):
                    pass
            elif not alloc_end_str:
                # No end date but carryover_su set: apply unconditionally
                configured_carryover = alloc.get("carryover_su")
                if configured_carryover is not None:
                    carryover_su = float(configured_carryover)
                    budget = budget + carryover_su
                    carryover_active = True
                    carryover_note = (
                        f"Carry-forward of {carryover_su:,.0f} SU applied"
                    )

        remaining = budget - used_su
        percent = round(used_su / budget * 100, 1) if budget > 0 else 0.0
        alert_thresholds = sorted(alloc.get("alerts", [80, 90, 100]))
        alert_level = None
        for threshold in reversed(alert_thresholds):
            if percent >= threshold:
                if threshold >= 100:
                    alert_level = "exceeded"
                elif threshold >= 90:
                    alert_level = "critical"
                else:
                    alert_level = "warning"
                break

        result = {
            "budget_su": budget,
            "used_su": round(used_su, 2),
            "remaining_su": round(remaining, 2),
            "percent_used": percent,
            "alert_level": alert_level,
            "alloc_type": alloc.get("type"),
            "alloc_period": alloc.get("period"),
            "start_date": alloc_start_str,
            "end_date": alloc_end_str,
            "carryover": alloc.get("carryover"),
        }
        if carryover_active:
            result["carryover_su"] = round(carryover_su, 2)
            result["carryover_note"] = carryover_note
        return result

    def _load_rates(self, rates_file: Optional[str]) -> Dict[str, Any]:
        path = rates_file or os.path.join(os.path.dirname(__file__), 'rates.json')
        try:
            with open(path) as fh:
                return json.load(fh)
        except OSError as e:
            logging.warning("Unable to read rates file %s: %s", path, e)
            return {}
        except json.JSONDecodeError as e:
            logging.error("Failed to parse rates file %s: %s", path, e)
            raise

    def _validate_cluster_cores(self, resources: Dict[str, Any]) -> int:
        """Return the cluster core count, or 0 if it cannot be determined.

        A zero return value signals to callers that projected revenue should be
        skipped rather than raising an exception — the rest of the summary data
        is still valid and useful.
        """
        cores = resources.get('cores')
        if not isinstance(cores, (int, float)) or cores <= 0:
            logging.warning(
                "Cluster core count unavailable (%r); projected revenue will be omitted.", cores
            )
            return 0
        return int(cores)

    def _apply_billing_rules(
        self,
        job: Dict[str, Any],
        rules: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Evaluate billing rules against a single job dict.

        Delegates to the module-level :func:`apply_billing_rules` function.
        """
        return apply_billing_rules(job, rules)

    def _build_account_details(
        self,
        usage: Dict[str, Dict[str, Any]],
        rates_cfg: Dict[str, Any],
    ) -> Tuple[List[Dict[str, Any]], float, float, float]:
        default_rate = rates_cfg.get('defaultRate', 0.01)
        default_gpu_rate = rates_cfg.get('defaultGpuRate', 0.0)
        overrides = rates_cfg.get('overrides', {})
        historical = rates_cfg.get('historicalRates', {})
        gpu_historical = rates_cfg.get('historicalGpuRates', {})
        billing_rules = rates_cfg.get('billing_rules', [])

        details: List[Dict[str, Any]] = []
        total_ch = total_gpu = total_cost = 0.0

        for month, accounts in usage.items():
            base_rate = historical.get(month, default_rate)
            base_gpu_rate = gpu_historical.get(month, default_gpu_rate)
            for account, vals in accounts.items():
                ovr = overrides.get(account, {})
                rate = ovr.get('rate', base_rate)
                gpu_rate = ovr.get('gpuRate', base_gpu_rate)
                discount = ovr.get('discount', 0)

                if rate < 0:
                    raise ValueError(f"Invalid rate {rate} for account {account}")
                if gpu_rate < 0:
                    raise ValueError(f"Invalid GPU rate {gpu_rate} for account {account}")
                if not 0 <= discount <= 1:
                    raise ValueError(f"Invalid discount {discount} for account {account}")

                users: List[Dict[str, Any]] = []
                for user, uvals in vals.get('users', {}).items():
                    jobs: List[Dict[str, Any]] = []
                    for job, jvals in uvals.get('jobs', {}).items():
                        j_cost = jvals['core_hours'] * rate + jvals.get('gpu_hours', 0.0) * gpu_rate
                        if 0 < discount < 1:
                            j_cost *= 1 - discount

                        # Build a flat job dict for rule evaluation.
                        job_for_rules: Dict[str, Any] = {
                            'state': jvals.get('state'),
                            'partition': jvals.get('partition'),
                            'elapsed': jvals.get('elapsed') or 0,
                            'job_name': jvals.get('job_name'),
                        }
                        rule_result = self._apply_billing_rules(job_for_rules, billing_rules)

                        billing_status: str
                        if not rule_result.get('charge', True):
                            j_cost = 0.0
                            billing_status = f"Not charged: {rule_result['reason']}"
                        elif rule_result.get('discount_percent', 0):
                            dp = rule_result['discount_percent']
                            j_cost *= (1 - dp / 100.0)
                            billing_status = f"Discounted {dp}%: {rule_result['reason']}"
                        elif rule_result.get('use_requested_time'):
                            # Use the job's time limit instead of actual elapsed time
                            # timelimit is in minutes in SLURM
                            requested_seconds = jvals.get('timelimit', 0) * 60
                            if requested_seconds > 0:
                                requested_hours = requested_seconds / 3600.0
                                # Derive CPU count from core_hours / elapsed_hours where possible
                                elapsed_secs = jvals.get('elapsed') or 0
                                if elapsed_secs > 0:
                                    job_cpus = jvals['core_hours'] / (elapsed_secs / 3600.0)
                                else:
                                    job_cpus = 1.0
                                j_cost = requested_hours * job_cpus * rate + jvals.get('gpu_hours', 0.0) * gpu_rate
                                billing_status = f"Charged at requested time: {rule_result.get('reason', '')}"
                            else:
                                billing_status = "Charged"  # fallback if no timelimit
                        else:
                            billing_status = "Charged"

                        jobs.append(
                            {
                                'job': job,
                                'job_name': jvals.get('job_name'),
                                'partition': jvals.get('partition'),
                                'start': jvals.get('start'),
                                'end': jvals.get('end'),
                                'elapsed': jvals.get('elapsed'),
                                'req_tres': jvals.get('req_tres'),
                                'alloc_tres': jvals.get('alloc_tres'),
                                'state': jvals.get('state'),
                                'core_hours': round(jvals['core_hours'], 2),
                                'cost': round(j_cost, 2),
                                'billing_rule_applied': billing_status,
                            }
                        )
                    # User cost: sum rule-adjusted job costs when per-job data is
                    # present.  When there are no job records (summary_only path)
                    # fall back to rate × core_hours so user totals stay meaningful.
                    if jobs:
                        u_cost = sum(j['cost'] for j in jobs)
                    else:
                        u_cost = uvals['core_hours'] * rate + uvals.get('gpu_hours', 0.0) * gpu_rate
                        if 0 < discount < 1:
                            u_cost *= 1 - discount
                    users.append(
                        {
                            'user': user,
                            'core_hours': round(uvals['core_hours'], 2),
                            'cost': round(u_cost, 2),
                            'jobs': jobs,
                        }
                    )
                # Account cost:
                # - When per-job data exists for all users, sum rule-adjusted user
                #   costs so that billing rule adjustments (no_charge, discount,
                #   use_requested_time) flow up correctly without double-applying.
                # - When users have no jobs (summary_only path) OR the account has
                #   GPU hours not tracked at user level, compute directly from the
                #   account-level core_hours/gpu_hours so GPU charges aren't lost.
                account_gpu = vals.get('gpu_hours', 0.0)
                users_have_jobs = users and any(u['jobs'] for u in users)
                users_track_gpu = users and sum(
                    uvals.get('gpu_hours', 0.0) for uvals in vals.get('users', {}).values()
                ) >= account_gpu - 1e-9
                if users_have_jobs and users_track_gpu:
                    acct_cost = sum(u['cost'] for u in users)
                else:
                    acct_cost = vals['core_hours'] * rate + account_gpu * gpu_rate
                    if 0 < discount < 1:
                        acct_cost *= 1 - discount
                alloc_info = self._compute_allocation_info(
                    account, vals['core_hours'], rates_cfg,
                    account_usage_by_month=usage,
                )
                details.append(
                    {
                        'account': account,
                        'core_hours': round(vals['core_hours'], 2),
                        'gpu_hours': round(vals.get('gpu_hours', 0.0), 2),
                        'cost': round(acct_cost, 2),
                        'users': users,
                        'allocation': alloc_info,
                    }
                )
                total_ch += vals['core_hours']
                total_gpu += vals.get('gpu_hours', 0.0)
                total_cost += acct_cost
        return details, total_ch, total_gpu, total_cost

    def _build_time_series(
        self, totals: Dict[str, Any]
    ) -> Tuple[List[Dict[str, float]], List[Dict[str, float]], List[Dict[str, float]]]:
        """Build time-series lists from aggregated usage totals.

        Delegates to the module-level :func:`build_time_series` function.
        """
        return build_time_series(totals)

    def _calculate_projected_revenue(
        self,
        start_dt: datetime,
        end_dt: datetime,
        cluster_cores: int,
        rates_cfg: Dict[str, Any],
    ) -> float:
        """Calculate projected revenue for the period.

        Delegates to the module-level :func:`calculate_projected_revenue` function.
        """
        return calculate_projected_revenue(start_dt, end_dt, cluster_cores, rates_cfg)

    def export_summary(
        self,
        start_time: Union[str, float],
        end_time: Union[str, float],
        rates_file: Optional[str] = None,
        summary_only: bool = False,
    ) -> Dict[str, Any]:
        """Export a summary of usage and costs.

        Rates represent a fixed cost per core-hour (for example, dollars
        per core-hour) and must be non-negative. ``discount`` values are
        fractional percentages, where ``0.2`` means a 20% discount, and
        they must fall between 0 and 1, inclusive. A :class:`ValueError`
        is raised if these constraints are violated.

        When *summary_only* is True the response omits per-user and per-job
        breakdowns and fetches a reduced column set from the database.  This
        is significantly faster on clusters with millions of job rows.
        """

        rates_cfg = self._load_rates(rates_file)
        resources = self.cluster_resources()
        cluster_cores = self._validate_cluster_cores(resources)

        if summary_only:
            # Use the SQL-aggregated path for summary_only — much faster on
            # large clusters as it avoids pulling individual job rows.
            start_ts = self._validate_time(start_time, "start_time")
            end_ts = self._validate_time(end_time, "end_time")
            agg_rows = self.fetch_summary_aggregated(start_ts, end_ts)

            # Convert the flat account list into the usage dict format that
            # _build_account_details expects: {month: {account: {...}}}.
            # We use a synthetic month key so all rows land in one bucket.
            start_dt_tmp = (
                _fromisoformat(start_time)
                if isinstance(start_time, str)
                else datetime.fromtimestamp(start_time)
            )
            month_key = start_dt_tmp.strftime('%Y-%m')
            usage: Dict[str, Any] = {month_key: {}}
            account_names: List[str] = []
            for row in agg_rows:
                acct = row['account']
                account_names.append(acct)
                usage[month_key][acct] = {
                    'core_hours': row['core_hours'],
                    'gpu_hours': row['gpu_hours'],
                    'users': {},
                }
            totals: Dict[str, Any] = {
                'daily': {},
                'monthly': {},
                'yearly': {},
                'daily_gpu': {},
                'monthly_gpu': {},
                'yearly_gpu': {},
                'partitions': set(),
                'accounts': set(account_names),
                'users': set(),
            }
            details, total_ch, total_gpu, total_cost = self._build_account_details(
                usage, rates_cfg
            )
            # Strip per-user drill-down from each account entry.
            for d in details:
                d.pop('users', None)
        else:
            usage, totals = self.aggregate_usage(start_time, end_time, summary_only=False)
            details, total_ch, total_gpu, total_cost = self._build_account_details(
                usage, rates_cfg
            )

        start_dt = (
            _fromisoformat(start_time)
            if isinstance(start_time, str)
            else datetime.fromtimestamp(start_time)
        )
        end_dt = (
            _fromisoformat(end_time)
            if isinstance(end_time, str)
            else datetime.fromtimestamp(end_time)
        )

        daily, monthly, yearly = self._build_time_series(totals)
        summary_block: Dict[str, Any] = {
            'period': f"{start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}",
            'total': round(total_cost, 2),
            'core_hours': round(total_ch, 2),
            'gpu_hours': round(total_gpu, 2),
            'cluster': resources,
        }

        if cluster_cores > 0:
            summary_block['projected_revenue'] = self._calculate_projected_revenue(
                start_dt, end_dt, cluster_cores, rates_cfg
            )
        else:
            summary_block['projected_revenue'] = None
            summary_block['projected_revenue_note'] = (
                "Cluster core count could not be determined from slurm.conf; "
                "projected revenue calculation skipped."
            )

        result: Dict[str, Any] = {
            'summary': summary_block,
            'details': details,
            'daily': daily,
            'monthly': monthly,
            'yearly': yearly,
            'invoices': self.fetch_invoices(start_time, end_time),
            'partitions': sorted(totals.get('partitions', [])),
            'accounts': sorted(totals.get('accounts', [])),
        }
        if not summary_only:
            result['users'] = sorted(totals.get('users', []))
        return result


if __name__ == "__main__":
    import argparse

    def _emit_error(exc: Exception) -> None:
        """Write a structured JSON error object to stdout and exit 1."""
        error_output = {
            "error": type(exc).__name__,
            "message": str(exc),
        }
        print(json.dumps(error_output))
        sys.exit(1)

    try:
        parser = argparse.ArgumentParser(description="Export Slurm usage data as JSON")
        parser.add_argument("--start", help="start date YYYY-MM-DD")
        parser.add_argument("--end", help="end date YYYY-MM-DD")
        parser.add_argument("--auto-daily", action="store_true", help="export unprocessed days")
        parser.add_argument("--output", default="usage.json", help="output file path or directory")
        parser.add_argument("--conf", help="path to slurmdbd.conf")
        parser.add_argument("--cluster", help="cluster name (table prefix)")
        parser.add_argument(
            "--slurm-conf",
            dest="slurm_conf",
            help="path to slurm.conf for auto cluster detection",
        )
        parser.add_argument("--accounts", action="store_true", help="list all accounts and exit")
        parser.add_argument(
            "--summary-only",
            dest="summary_only",
            action="store_true",
            help=(
                "return account-level totals and time series only; "
                "skip per-user and per-job breakdowns for faster queries on busy clusters"
            ),
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            metavar="N",
            help="maximum number of job rows to fetch (for paginated detail views)",
        )
        parser.add_argument(
            "--offset",
            type=int,
            default=None,
            metavar="N",
            help="row offset for paginated job fetching (requires --limit)",
        )

        args = parser.parse_args()

        db = SlurmDB(
            config_file=args.conf,
            cluster=args.cluster,
            slurm_conf=args.slurm_conf,
        )

        if args.accounts:
            data = {"accounts": db.fetch_all_accounts()}
            if args.output in ("-", "/dev/stdout"):
                json.dump(data, sys.stdout, indent=2, default=str)
                sys.stdout.write("\n")
            else:
                with open(args.output, "w") as fh:
                    json.dump(data, fh, indent=2, default=str)
                print(f"Wrote {args.output}")
            sys.exit(0)

        def _export_day(day):
            day_str = day.isoformat()
            data = db.export_summary(day_str, day_str, summary_only=args.summary_only)
            if args.output in ("-", "/dev/stdout"):
                json.dump(data, sys.stdout, indent=2, default=str)
                sys.stdout.write("\n")
            else:
                out_path = args.output
                if args.auto_daily and not args.start and not args.end:
                    os.makedirs(out_path, exist_ok=True)
                    out_path = os.path.join(out_path, f"{day_str}.json")
                with open(out_path, "w") as fh:
                    json.dump(data, fh, indent=2, default=str)
                print(f"Wrote {out_path}")
            _write_last_run(day_str)

        if args.auto_daily and not args.start and not args.end:
            last = _read_last_run()
            if last:
                start = _fromisoformat(last).date() + timedelta(days=1)
            else:
                start = date.today() - timedelta(days=1)
            end = date.today() if start < date.today() else start
            current = start
            while current <= end:
                _export_day(current)
                current += timedelta(days=1)
        else:
            if not args.start or not args.end:
                parser.error("--start and --end required unless --auto-daily is used without them")
            data = db.export_summary(
                args.start,
                args.end,
                summary_only=args.summary_only,
            )
            if args.output == '-' or args.output == '/dev/stdout':
                json.dump(data, sys.stdout, indent=2, default=str)
            else:
                with open(args.output, "w") as fh:
                    json.dump(data, fh, indent=2, default=str)
                print(f"Wrote {args.output}")
            _write_last_run(args.end)

    except Exception as e:
        _emit_error(e)
