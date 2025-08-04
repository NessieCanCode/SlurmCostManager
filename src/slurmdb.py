#!/usr/bin/env python3

import os
import re
import json
import sys
from datetime import datetime

try:
    import pymysql
except ImportError:  # fallback if pymysql is missing
    pymysql = None


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
            return value
        raise ValueError(f"Invalid {name} format")

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

    def _parse_mem(self, mem_str):
        if not mem_str:
            return 0.0
        m = re.match(r"(\d+(?:\.\d+)?)([MG])", str(mem_str))
        if not m:
            return 0.0
        val = float(m.group(1))
        unit = m.group(2).upper()
        if unit == "M":
            val /= 1024.0
        return val  # GB

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
            query = (
                f"SELECT j.account, a.user AS user_name, j.time_start, j.time_end, "
                f"j.tres_alloc, j.mem_req FROM {job_table} AS j "
                f"LEFT JOIN {assoc_table} AS a ON j.id_assoc = a.id_assoc "
                f"WHERE j.time_start >= %s AND j.time_end <= %s"
            )
            cur.execute(query, (start_time, end_time))
            return cur.fetchall()

    def aggregate_usage(self, start_time, end_time):
        """Aggregate usage metrics by account and month."""
        rows = self.fetch_usage_records(start_time, end_time)
        agg = {}
        for row in rows:
            start = row['time_start']
            end = row['time_end'] or start
            if isinstance(start, str):
                start = datetime.fromisoformat(start)
            if isinstance(end, str):
                end = datetime.fromisoformat(end)
            dur_hours = (end - start).total_seconds() / 3600.0
            month = start.strftime('%Y-%m')
            account = row.get('account') or 'unknown'
            user = row.get('user_name') or 'unknown'
            cpus = self._parse_tres(row.get('tres_alloc'), 'cpu')
            nodes = self._parse_tres(row.get('tres_alloc'), 'node')
            mem_gb = self._parse_mem(row.get('mem_req'))

            month_entry = agg.setdefault(month, {})
            acct_entry = month_entry.setdefault(
                account,
                {
                    'core_hours': 0.0,
                    'instance_hours': 0.0,
                    'gb_month': 0.0,
                    'users': {},
                },
            )
            acct_entry['core_hours'] += cpus * dur_hours
            acct_entry['instance_hours'] += nodes * dur_hours
            acct_entry['gb_month'] += mem_gb * dur_hours / (24.0 * 30.0)
            user_entry = acct_entry['users'].setdefault(
                user, {'core_hours': 0.0}
            )
            user_entry['core_hours'] += cpus * dur_hours
        return agg

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
        usage = self.aggregate_usage(start_time, end_time)
        summary = {'summary': {}, 'details': [], 'invoices': []}
        total_ch = 0.0
        total_ih = 0.0
        total_gbm = 0.0
        total_cost = 0.0

        rates_path = os.path.join(os.path.dirname(__file__), 'rates.json')
        try:
            with open(rates_path) as fh:
                rates_cfg = json.load(fh)
        except Exception:
            rates_cfg = {}
        default_rate = rates_cfg.get('defaultRate', 0.01)

        for month, accounts in usage.items():
            for account, vals in accounts.items():
                users = []
                acct_cost = vals['core_hours'] * default_rate
                for user, uvals in vals.get('users', {}).items():
                    u_cost = uvals['core_hours'] * default_rate
                    users.append({
                        'user': user,
                        'core_hours': round(uvals['core_hours'], 2),
                        'cost': round(u_cost, 2),
                    })
                summary['details'].append(
                    {
                        'account': account,
                        'core_hours': round(vals['core_hours'], 2),
                        'instance_hours': round(vals['instance_hours'], 2),
                        'gb_month': round(vals['gb_month'], 2),
                        'cost': round(acct_cost, 2),
                        'users': users,
                    }
                )
                total_ch += vals['core_hours']
                total_ih += vals['instance_hours']
                total_gbm += vals['gb_month']
                total_cost += acct_cost
        summary['summary'] = {
            'month': (
                datetime.fromisoformat(start_time)
                if isinstance(start_time, str)
                else datetime.fromtimestamp(start_time)
            ).strftime('%B %Y'),
            'total': round(total_cost, 2),
            'core_hours': round(total_ch, 2),
            'instance_hours': round(total_ih, 2),
            'gb_month': round(total_gbm, 2),
        }
        summary['invoices'] = self.fetch_invoices(start_time, end_time)
        return summary


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Export Slurm usage data as JSON")
    parser.add_argument("--start", required=True, help="start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="end date YYYY-MM-DD")
    parser.add_argument("--output", default="usage.json", help="output file path")
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
    data = db.export_summary(args.start, args.end)

    if args.output == '-' or args.output == '/dev/stdout':
        json.dump(data, sys.stdout, indent=2, default=str)
    else:
        with open(args.output, "w") as fh:
            json.dump(data, fh, indent=2, default=str)
        print(f"Wrote {args.output}")
