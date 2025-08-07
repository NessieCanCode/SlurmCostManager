#!/usr/bin/env python3
import os
import re
import json
import logging
import sys
from datetime import date, datetime, timedelta

try:
    import pymysql
except ImportError:  # fallback if pymysql is missing
    pymysql = None


STATE_FILE = os.path.expanduser("last_run.json")


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
        conf_path = config_file or os.environ.get("SLURMDB_CONF", "/etc/slurm/slurmdbd.conf")
        cfg = self._load_config(conf_path)

        self.host = host or os.environ.get("SLURMDB_HOST") or cfg.get("host", "localhost")
        self.port = int(port or os.environ.get("SLURMDB_PORT") or cfg.get("port", 3306))
        self.user = user or os.environ.get("SLURMDB_USER") or cfg.get("user", "slurm")
        self.password = password or os.environ.get("SLURMDB_PASS") or cfg.get("password", "")
        self.database = database or os.environ.get("SLURMDB_DB") or cfg.get("db", "slurm_acct_db")
        self._conn = None
        self._config_file = conf_path
        self._slurm_conf = slurm_conf or os.environ.get("SLURM_CONF", "/etc/slurm/slurm.conf")
        self.cluster = (
            cluster
            or os.environ.get("SLURM_CLUSTER")
            or self._load_cluster_name(self._slurm_conf)
        )

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
                dt = datetime.fromisoformat(value)
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
            return datetime.fromisoformat(value)
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

    def fetch_usage_records(self, start_time, end_time):
        """Fetch raw job records from SlurmDBD."""
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
            cpu_col = "cpus_alloc"
            cur.execute(f"SHOW COLUMNS FROM {job_table} LIKE %s", (cpu_col,))
            if not cur.fetchone():
                cpu_col = "cpus_req"

            job_name_col = "job_name"
            cur.execute(f"SHOW COLUMNS FROM {job_table} LIKE %s", (job_name_col,))
            if not cur.fetchone():
                job_name_col = "name"

            query = (
                f"SELECT j.id_job AS jobid, j.{job_name_col} AS job_name, j.account, j.partition, "
                f"a.user AS user_name, j.time_start, j.time_end, j.tres_req, j.tres_alloc, "
                f"j.{cpu_col} AS cpus_alloc, j.state FROM {job_table} AS j "
                f"LEFT JOIN {assoc_table} AS a ON j.id_assoc = a.id_assoc "
                f"WHERE j.time_start >= %s AND j.time_end <= %s"
            )
            cur.execute(query, (start_time, end_time))
            return cur.fetchall()

    def aggregate_usage(self, start_time, end_time):
        """Aggregate usage metrics by account and time period."""
        rows = self.fetch_usage_records(start_time, end_time)
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
            user_entry = acct_entry['users'].setdefault(
                user, {'core_hours': 0.0, 'jobs': {}}
            )
            user_entry['core_hours'] += cpus * dur_hours
            job_entry = user_entry['jobs'].setdefault(
                job,
                {
                    'core_hours': 0.0,
                    'job_name': row.get('job_name'),
                    'partition': partition,
                    'start': start.isoformat(),
                    'end': end.isoformat(),
                    'elapsed': int((end - start).total_seconds()),
                    'req_tres': row.get('tres_req'),
                    'alloc_tres': row.get('tres_alloc'),
                    'state': row.get('state'),
                },
            )
            job_entry['core_hours'] += cpus * dur_hours
        return agg, totals

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

    def export_summary(self, start_time, end_time):
        """Export a summary of usage and costs.

        Rates represent a fixed cost per core-hour (for example, dollars
        per core-hour) and must be non-negative. ``discount`` values are
        fractional percentages, where ``0.2`` means a 20% discount, and
        they must fall between 0 and 1, inclusive. A :class:`ValueError`
        is raised if these constraints are violated.
        """

        usage, totals = self.aggregate_usage(start_time, end_time)
        summary = {
            'summary': {},
            'details': [],
            'daily': [],
            'monthly': [],
            'yearly': [],
            'invoices': [],
        }
        total_ch = 0.0
        total_gpu = 0.0
        total_cost = 0.0

        rates_path = os.path.join(os.path.dirname(__file__), 'rates.json')
        try:
            with open(rates_path) as fh:
                rates_cfg = json.load(fh)
        except OSError as e:
            logging.warning("Unable to read rates file %s: %s", rates_path, e)
            rates_cfg = {}
        except json.JSONDecodeError as e:
            logging.error("Failed to parse rates file %s: %s", rates_path, e)
            raise
        default_rate = rates_cfg.get('defaultRate', 0.01)
        default_gpu_rate = rates_cfg.get('defaultGpuRate', 0.0)
        overrides = rates_cfg.get('overrides', {})
        historical = rates_cfg.get('historicalRates', {})
        gpu_historical = rates_cfg.get('historicalGpuRates', {})

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
                    raise ValueError(
                        f"Invalid GPU rate {gpu_rate} for account {account}"
                    )
                if not 0 <= discount <= 1:
                    raise ValueError(
                        f"Invalid discount {discount} for account {account}"
                    )

                acct_cost = vals['core_hours'] * rate + vals.get('gpu_hours', 0.0) * gpu_rate
                if 0 < discount < 1:
                    acct_cost *= 1 - discount
                users = []
                for user, uvals in vals.get('users', {}).items():
                    u_cost = uvals['core_hours'] * rate
                    if 0 < discount < 1:
                        u_cost *= 1 - discount
                    jobs = []
                    for job, jvals in uvals.get('jobs', {}).items():
                        j_cost = jvals['core_hours'] * rate
                        if 0 < discount < 1:
                            j_cost *= 1 - discount
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
                            }
                        )
                    users.append(
                        {
                            'user': user,
                            'core_hours': round(uvals['core_hours'], 2),
                            'cost': round(u_cost, 2),
                            'jobs': jobs,
                        }
                    )
                summary['details'].append(
                    {
                        'account': account,
                        'core_hours': round(vals['core_hours'], 2),
                        'gpu_hours': round(vals.get('gpu_hours', 0.0), 2),
                        'cost': round(acct_cost, 2),
                        'users': users,
                    }
                )
                total_ch += vals['core_hours']
                total_gpu += vals.get('gpu_hours', 0.0)
                total_cost += acct_cost
        start_dt = (
            datetime.fromisoformat(start_time)
            if isinstance(start_time, str)
            else datetime.fromtimestamp(start_time)
        )
        end_dt = (
            datetime.fromisoformat(end_time)
            if isinstance(end_time, str)
            else datetime.fromtimestamp(end_time)
        )
        summary['summary'] = {
            'period': f"{start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}",
            'total': round(total_cost, 2),
            'core_hours': round(total_ch, 2),
            'gpu_hours': round(total_gpu, 2),
        }
        summary['daily'] = [
            {
                'date': d,
                'core_hours': round(totals['daily'].get(d, 0.0), 2),
                'gpu_hours': round(totals.get('daily_gpu', {}).get(d, 0.0), 2),
            }
            for d in sorted(set(totals['daily']) | set(totals.get('daily_gpu', {})))
        ]
        summary['monthly'] = [
            {
                'month': m,
                'core_hours': round(totals['monthly'].get(m, 0.0), 2),
                'gpu_hours': round(totals.get('monthly_gpu', {}).get(m, 0.0), 2),
            }
            for m in sorted(set(totals['monthly']) | set(totals.get('monthly_gpu', {})))
        ]
        summary['yearly'] = [
            {
                'year': y,
                'core_hours': round(totals['yearly'].get(y, 0.0), 2),
                'gpu_hours': round(totals.get('yearly_gpu', {}).get(y, 0.0), 2),
            }
            for y in sorted(set(totals['yearly']) | set(totals.get('yearly_gpu', {})))
        ]
        summary['invoices'] = self.fetch_invoices(start_time, end_time)
        summary['partitions'] = sorted(totals.get('partitions', []))
        summary['accounts'] = sorted(totals.get('accounts', []))
        summary['users'] = sorted(totals.get('users', []))
        return summary


if __name__ == "__main__":
    import argparse

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

    args = parser.parse_args()

    db = SlurmDB(
        config_file=args.conf,
        cluster=args.cluster,
        slurm_conf=args.slurm_conf,
    )

    def _export_day(day):
        day_str = day.isoformat()
        data = db.export_summary(day_str, day_str)
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
            start = datetime.fromisoformat(last).date() + timedelta(days=1)
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
        data = db.export_summary(args.start, args.end)
        if args.output == '-' or args.output == '/dev/stdout':
            json.dump(data, sys.stdout, indent=2, default=str)
        else:
            with open(args.output, "w") as fh:
                json.dump(data, fh, indent=2, default=str)
            print(f"Wrote {args.output}")
        _write_last_run(args.end)
