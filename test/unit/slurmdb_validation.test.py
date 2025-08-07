import unittest
import json
from slurmdb import SlurmDB
from slurm_schema import extract_schema

class SlurmDBValidationTests(unittest.TestCase):
    def test_invalid_cluster_rejected(self):
        with self.assertRaises(ValueError):
            SlurmDB(cluster="bad;DROP TABLE")

    def test_invalid_port_rejected(self):
        with self.assertRaises(ValueError):
            SlurmDB(port=70000)

    def test_valid_config_allowed(self):
        db = SlurmDB(host="localhost", port=3306, user="slurm", password="", database="slurm_acct_db", cluster="cluster1")
        self.assertEqual(db.cluster, "cluster1")

    def test_invalid_time_format(self):
        db = SlurmDB()
        with self.assertRaises(ValueError):
            db._validate_time("not-a-date", "start_time")

    def test_validate_time_parses_date_strings(self):
        db = SlurmDB()
        ts = db._validate_time("1970-01-02", "start_time")
        # 1970-01-02 is 86400 seconds from the epoch
        self.assertEqual(ts, 86400)

    def test_parse_mem_converts_units(self):
        db = SlurmDB()
        self.assertEqual(db._parse_mem("1G"), 1.0)
        self.assertEqual(db._parse_mem("1024M"), 1.0)
        self.assertEqual(db._parse_mem("1T"), 1024.0)
        self.assertAlmostEqual(db._parse_mem("1048576K"), 1.0)

    def test_aggregate_usage_handles_int_timestamps(self):
        db = SlurmDB()
        db.fetch_usage_records = lambda start, end: [
            {
                'account': 'acct',
                'user_name': 'user',
                'time_start': 0,
                'time_end': 3600,
                'tres_alloc': 'cpu=2,node=1',
                'mem_req': '1024M',
            }
        ]
        agg, totals = db.aggregate_usage(0, 3600)
        self.assertIn('1970-01', agg)
        self.assertAlmostEqual(agg['1970-01']['acct']['core_hours'], 2.0)
        self.assertAlmostEqual(totals['daily']['1970-01-01'], 2.0)

    def test_cpus_alloc_fallback(self):
        db = SlurmDB()
        db.fetch_usage_records = lambda start, end: [
            {
                'account': 'acct',
                'user_name': 'user',
                'time_start': 0,
                'time_end': 3600,
                'tres_alloc': '',
                'cpus_alloc': 2,
            }
        ]
        agg, totals = db.aggregate_usage(0, 3600)
        self.assertAlmostEqual(agg['1970-01']['acct']['core_hours'], 2.0)

    def test_aggregate_usage_includes_job_details(self):
        db = SlurmDB()
        db.fetch_usage_records = lambda start, end: [
            {
                'jobid': 123,
                'job_name': 'jobname',
                'account': 'acct',
                'user_name': 'user',
                'partition': 'p1',
                'time_start': 0,
                'time_end': 3600,
                'tres_req': 'cpu=1,mem=1G',
                'tres_alloc': 'cpu=1,mem=1G,gres/gpu:tesla=1',
                'cpus_alloc': 1,
                'state': 'COMPLETED',
            }
        ]
        agg, _ = db.aggregate_usage(0, 3600)
        job = agg['1970-01']['acct']['users']['user']['jobs']['123']
        self.assertEqual(job['job_name'], 'jobname')
        self.assertEqual(job['partition'], 'p1')
        self.assertEqual(job['start'], '1970-01-01T00:00:00')
        self.assertEqual(job['end'], '1970-01-01T01:00:00')
        self.assertEqual(job['elapsed'], 3600)
        self.assertEqual(job['req_tres'], 'cpu=1,mem=1G')
        self.assertEqual(job['alloc_tres'], 'cpu=1,mem=1G,gres/gpu:tesla=1')
        self.assertEqual(job['state'], 'COMPLETED')

    def test_close_closes_connection(self):
        class FakeConn:
            def __init__(self):
                self.closed = False

            def close(self):
                self.closed = True

        db = SlurmDB()
        fake = FakeConn()
        db._conn = fake
        db.close()
        self.assertTrue(fake.closed)
        self.assertIsNone(db._conn)

    def test_context_manager_closes_connection(self):
        class FakeConn:
            def __init__(self):
                self.closed = False

            def close(self):
                self.closed = True

        db = SlurmDB()

        def fake_connect():
            db._conn = FakeConn()

        db.connect = fake_connect

        with db as ctx:
            self.assertIs(ctx, db)
            self.assertIsNotNone(db._conn)
            conn = db._conn

        self.assertTrue(conn.closed)
        self.assertIsNone(db._conn)

    def test_extract_schema_with_context_manager_closes_connection(self):
        class FakeCursor:
            def __init__(self, dbname):
                self.dbname = dbname

            def execute(self, query):
                if query == "SHOW TABLES":
                    key = f"Tables_in_{self.dbname}"
                    self._fetchall = [{key: "example"}]
                elif query.startswith("SHOW COLUMNS"):
                    self._fetchall = [{"Field": "col"}]

            def fetchall(self):
                return getattr(self, "_fetchall", [])

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

        class FakeConn:
            def __init__(self, dbname):
                self.closed = False
                self.cursor_obj = FakeCursor(dbname)

            def cursor(self):
                return self.cursor_obj

            def close(self):
                self.closed = True

        db = SlurmDB(database="mydb")

        def fake_connect():
            db._conn = FakeConn(db.database)

        db.connect = fake_connect

        with db as ctx:
            extract_schema(ctx)
            conn = ctx._conn

        self.assertTrue(conn.closed)
        self.assertIsNone(db._conn)

    def test_fetch_usage_records_uses_cpus_req_if_alloc_missing(self):
        with open('test/example_slurm_schema_for_testing.json') as fh:
            schema = json.load(fh)
        job_cols = schema.get('localcluster_job_table', [])

        class FakeCursor:
            def __init__(self):
                self.queries = []

            def execute(self, query, params=None):
                self.queries.append(query)
                if query.lower().startswith("show columns"):
                    column = params[0] if params else None
                    if column in job_cols:
                        self._fetchone = {'Field': column}
                    else:
                        self._fetchone = None
                else:
                    self._fetchall = []

            def fetchone(self):
                return getattr(self, "_fetchone", None)

            def fetchall(self):
                return getattr(self, "_fetchall", [])

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

        class FakeConn:
            def __init__(self):
                self.cursor_obj = FakeCursor()

            def cursor(self):
                return self.cursor_obj

        db = SlurmDB(cluster="localcluster")
        db._conn = FakeConn()
        db.connect = lambda: None
        db.fetch_usage_records(0, 0)
        queries = db._conn.cursor_obj.queries
        self.assertIn("j.cpus_req AS cpus_alloc", queries[1])

if __name__ == '__main__':
    unittest.main()
