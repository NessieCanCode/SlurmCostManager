import unittest
from unittest import mock
from slurmdb import SlurmDB


class FakeCursor:
    def __init__(self, rows):
        self.last_query = None
        self.rows = rows

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        pass

    def execute(self, query, params=None):
        self.last_query = query
        self.params = params

    def fetchone(self):
        if "SHOW TABLES" in self.last_query:
            return ("invoices",)
        return None

    def fetchall(self):
        return self.rows


class FakeConn:
    def __init__(self, rows):
        self.rows = rows

    def cursor(self):
        return FakeCursor(self.rows)


class InvoiceRetrievalTests(unittest.TestCase):
    def _make_db(self, rows):
        db = SlurmDB()
        db._conn = FakeConn(rows)
        return db

    def test_fetch_invoices_returns_rows(self):
        rows = [
            {"id": "1", "file": "inv1.pdf", "invoice_date": "2023-10-01"}
        ]
        db = self._make_db(rows)
        with mock.patch.object(SlurmDB, "connect", lambda self: None):
            invoices = db.fetch_invoices("2023-10-01", "2023-10-31")
        self.assertEqual(len(invoices), 1)
        self.assertEqual(invoices[0]["filename"], "inv1.pdf")
        self.assertEqual(invoices[0]["date"], "2023-10-01")

    def test_invalid_invoice_skipped(self):
        rows = [
            {"id": "1", "file": "inv1.pdf", "invoice_date": "2023-10-01"},
            {"id": "2", "invoice_date": "2023-10-01"},  # missing filename
        ]
        db = self._make_db(rows)
        with mock.patch.object(SlurmDB, "connect", lambda self: None):
            with self.assertLogs(level="WARNING") as log:
                invoices = db.fetch_invoices("2023-10-01", "2023-10-31")
        self.assertEqual(len(invoices), 1)
        self.assertIn("Invalid invoice record skipped", log.output[0])


if __name__ == "__main__":
    unittest.main()

