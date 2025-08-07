import unittest
from slurmdb import SlurmDB


class AccountListingTests(unittest.TestCase):
    def test_fetch_accounts_from_acct_table(self):
        db = SlurmDB()
        db.connect = lambda: None

        class FakeCursor:
            def __init__(self):
                self.last_query = ""

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

            def execute(self, query, params=None):
                self.last_query = query

            def fetchone(self):
                if "SHOW TABLES LIKE" in self.last_query:
                    return {"name": "acct_table"}
                return None

            def fetchall(self):
                if "SELECT name FROM acct_table" in self.last_query:
                    return [{"name": "acct1"}, {"name": "acct2"}]
                return []

        class FakeConn:
            def cursor(self):
                return FakeCursor()

        db._conn = FakeConn()
        accounts = db.fetch_all_accounts()
        self.assertEqual(accounts, ["acct1", "acct2"])

    def test_fetch_accounts_from_assoc_table_when_acct_table_missing(self):
        db = SlurmDB(cluster="localcluster")
        db.connect = lambda: None

        class FakeCursor:
            def __init__(self):
                self.last_query = ""

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                pass

            def execute(self, query, params=None):
                self.last_query = query

            def fetchone(self):
                # acct_table does not exist
                return None

            def fetchall(self):
                if "localcluster_assoc_table" in self.last_query:
                    return [
                        {"acct": "acct1"},
                        {"acct": "acct2"},
                        {"acct": "acct1"},
                    ]
                return []

        class FakeConn:
            def cursor(self):
                return FakeCursor()

        db._conn = FakeConn()
        accounts = db.fetch_all_accounts()
        self.assertEqual(accounts, ["acct1", "acct2"])


if __name__ == "__main__":
    unittest.main()
