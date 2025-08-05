import unittest
from slurm_schema import extract_schema_from_dump

class SlurmSchemaDumpTests(unittest.TestCase):
    def test_job_table_uses_cpus_req(self):
        schema = extract_schema_from_dump('test/test_db_dump.sql')
        cols = schema.get('localcluster_job_table', [])
        self.assertIn('cpus_req', cols)
        self.assertNotIn('cpus_alloc', cols)

if __name__ == '__main__':
    unittest.main()
