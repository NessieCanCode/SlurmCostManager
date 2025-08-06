import unittest
from unittest import mock
from slurmdb import SlurmDB


class FakeCursor:
    def __init__(self):
        self.last_query = None
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        pass
    def execute(self, query, params=None):
        self.last_query = query
        self.params = params
    def fetchone(self):
        if "SHOW TABLES" in self.last_query:
            return ('invoices',)
        return None
    def fetchall(self):
        return [{'file': 'inv1.pdf', 'invoice_date': '2023-10-01'}]


class FakeConn:
    def cursor(self):
        return FakeCursor()


class InvoiceRetrievalTests(unittest.TestCase):
    def test_fetch_invoices_returns_rows(self):
        db = SlurmDB()
        db._conn = FakeConn()
        with mock.patch.object(SlurmDB, 'connect', lambda self: None):
            invoices = db.fetch_invoices('2023-10-01', '2023-10-31')
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0]['file'], 'inv1.pdf')
        self.assertEqual(invoices[0]['date'], '2023-10-01')


if __name__ == '__main__':
    unittest.main()
