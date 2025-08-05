import unittest
from unittest import mock
from slurmdb import SlurmDB


class BillingSummaryTests(unittest.TestCase):
    def test_export_summary_aggregates_costs(self):
        usage = {
            '2023-10': {
                'acct': {
                    'core_hours': 10.0,
                    'users': {
                        'user1': {'core_hours': 10.0, 'jobs': {}}
                    },
                }
            }
        }
        invoices = [{'file': 'inv1.pdf', 'date': '2023-10-01'}]
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ):
            with mock.patch.object(SlurmDB, 'fetch_invoices', return_value=invoices):
                db = SlurmDB()
                summary = db.export_summary('2023-10-01', '2023-10-31')
        self.assertEqual(summary['summary']['total'], 0.2)
        self.assertEqual(summary['details'][0]['account'], 'acct')
        self.assertEqual(summary['details'][0]['core_hours'], 10.0)
        self.assertEqual(summary['details'][0]['cost'], 0.2)
        self.assertEqual(summary['invoices'][0]['file'], 'inv1.pdf')


if __name__ == '__main__':
    unittest.main()
