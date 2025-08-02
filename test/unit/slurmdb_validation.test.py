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

if __name__ == '__main__':
    unittest.main()
