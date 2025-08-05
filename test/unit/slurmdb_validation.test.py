import unittest
from slurmdb import SlurmDB

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

if __name__ == '__main__':
    unittest.main()
