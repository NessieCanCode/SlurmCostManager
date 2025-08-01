import os
import re
import json
from datetime import datetime

try:
    import pymysql
except ImportError:  # fallback if pymysql is missing
    pymysql = None


class SlurmDB:
    """Simple wrapper around the Slurm accounting database."""

    def __init__(self, host=None, port=None, user=None, password=None, database=None):
        self.host = host or os.environ.get("SLURMDB_HOST", "localhost")
        self.port = int(port or os.environ.get("SLURMDB_PORT", 3306))
        self.user = user or os.environ.get("SLURMDB_USER", "slurm")
        self.password = password or os.environ.get("SLURMDB_PASS", "")
        self.database = database or os.environ.get("SLURMDB_DB", "slurm_acct_db")
        self._conn = None

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
        self.connect()
        with self._conn.cursor() as cur:
            query = (
                "SELECT account, time_start, time_end, tres_alloc, req_mem "
                "FROM job_table WHERE time_start >= %s AND time_end <= %s"
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
            cpus = self._parse_tres(row.get('tres_alloc'), 'cpu')
            nodes = self._parse_tres(row.get('tres_alloc'), 'node')
            mem_gb = self._parse_mem(row.get('req_mem'))

            month_entry = agg.setdefault(month, {})
            acct_entry = month_entry.setdefault(
                account, {'core_hours': 0.0, 'instance_hours': 0.0, 'gb_month': 0.0}
            )
            acct_entry['core_hours'] += cpus * dur_hours
            acct_entry['instance_hours'] += nodes * dur_hours
            acct_entry['gb_month'] += mem_gb * dur_hours / (24.0 * 30.0)
        return agg

    def fetch_invoices(self, start_date=None, end_date=None):
        """Fetch invoice metadata from the database if present."""
        self.connect()
        with self._conn.cursor() as cur:
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
        for month, accounts in usage.items():
            for account, vals in accounts.items():
                summary['details'].append(
                    {
                        'account': account,
                        'month': month,
                        'core_hours': round(vals['core_hours'], 2),
                        'instance_hours': round(vals['instance_hours'], 2),
                        'gb_month': round(vals['gb_month'], 2),
                    }
                )
                total_ch += vals['core_hours']
                total_ih += vals['instance_hours']
                total_gbm += vals['gb_month']
        summary['summary'] = {
            'period_start': start_time,
            'period_end': end_time,
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

    args = parser.parse_args()

    db = SlurmDB()
    data = db.export_summary(args.start, args.end)

    with open(args.output, "w") as fh:
        json.dump(data, fh, indent=2, default=str)

    print(f"Wrote {args.output}")
