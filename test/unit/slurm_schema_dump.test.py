import os
import unittest
from slurm_schema import extract_schema_from_dump

class SlurmSchemaDumpTests(unittest.TestCase):
    def test_job_table_uses_cpus_req(self):
        schema = extract_schema_from_dump('test/test_db_dump.sql')
        cols = schema.get('localcluster_job_table', [])
        self.assertIn('cpus_req', cols)
        self.assertNotIn('cpus_alloc', cols)

    def test_missing_dump_file_raises(self):
        with self.assertRaises(FileNotFoundError) as cm:
            extract_schema_from_dump('test/does_not_exist.sql')
        self.assertIn('Unable to read dump file', str(cm.exception))

    def test_unreadable_dump_file_raises(self):
        path = 'test/unreadable_dir'
        os.makedirs(path, exist_ok=True)
        try:
            with self.assertRaises(FileNotFoundError) as cm:
                extract_schema_from_dump(path)
            self.assertIn('Unable to read dump file', str(cm.exception))
        finally:
            os.rmdir(path)

if __name__ == '__main__':
    unittest.main()
