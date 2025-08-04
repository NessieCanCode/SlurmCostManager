import unittest
from slurmdb import SlurmDB


class AuthBoundaryTests(unittest.TestCase):
    def test_invalid_host_rejected(self):
        with self.assertRaises(ValueError):
            SlurmDB(host='bad;host')

    def test_invalid_user_rejected(self):
        with self.assertRaises(ValueError):
            SlurmDB(user='bad user')


if __name__ == '__main__':
    unittest.main()
