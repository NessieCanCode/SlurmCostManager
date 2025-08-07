import io
import unittest
from unittest import mock
from slurmdb import SlurmDB


class BillingSummaryTests(unittest.TestCase):
    def test_export_summary_aggregates_costs(self):
        usage = {
            '2023-10': {
                'acct': {
                    'core_hours': 10.0,
                    'gpu_hours': 5.0,
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
            return_value=(usage, {
                'daily': {},
                'monthly': {},
                'yearly': {},
                'daily_gpu': {},
                'monthly_gpu': {},
                'yearly_gpu': {},
            }),
        ):
            with mock.patch.object(SlurmDB, 'fetch_invoices', return_value=invoices):
                db = SlurmDB()
                summary = db.export_summary('2023-10-01', '2023-10-31')
        self.assertEqual(summary['summary']['total'], 1.2)
        self.assertEqual(summary['details'][0]['account'], 'acct')
        self.assertEqual(summary['details'][0]['core_hours'], 10.0)
        self.assertEqual(summary['details'][0]['gpu_hours'], 5.0)
        self.assertEqual(summary['details'][0]['cost'], 1.2)
        self.assertEqual(summary['summary']['gpu_hours'], 5.0)
        self.assertEqual(summary['invoices'][0]['file'], 'inv1.pdf')

    def test_export_summary_applies_overrides_and_discounts(self):
        usage = {
            '2024-02': {
                'research': {
                    'core_hours': 10.0,
                    'users': {'u': {'core_hours': 10.0, 'jobs': {}}},
                },
                'education': {
                    'core_hours': 10.0,
                    'users': {'u': {'core_hours': 10.0, 'jobs': {}}},
                },
                'special': {
                    'core_hours': 10.0,
                    'users': {'u': {'core_hours': 10.0, 'jobs': {}}},
                },
            }
        }
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]):
            db = SlurmDB()
            summary = db.export_summary('2024-02-01', '2024-02-29')
        costs = {d['account']: d['cost'] for d in summary['details']}
        self.assertAlmostEqual(costs['research'], 0.1)
        self.assertAlmostEqual(costs['education'], 0.1)
        self.assertAlmostEqual(costs['special'], 0.23)
        self.assertAlmostEqual(summary['summary']['total'], 0.43)

    def test_export_summary_preserves_job_details(self):
        usage = {
            '2024-03': {
                'acct': {
                    'core_hours': 1.0,
                    'users': {
                        'u': {
                            'core_hours': 1.0,
                            'jobs': {
                                '123': {
                                    'core_hours': 1.0,
                                    'job_name': 'name',
                                    'partition': 'p1',
                                    'start': '1970-01-01T00:00:00',
                                    'end': '1970-01-01T01:00:00',
                                    'elapsed': 3600,
                                    'req_tres': 'cpu=1',
                                    'alloc_tres': 'cpu=1',
                                    'state': 'COMPLETED',
                                }
                            },
                        }
                    },
                }
            }
        }
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]):
            db = SlurmDB()
            summary = db.export_summary('2024-03-01', '2024-03-31')
        job = summary['details'][0]['users'][0]['jobs'][0]
        self.assertEqual(job['job_name'], 'name')
        self.assertEqual(job['partition'], 'p1')
        self.assertEqual(job['start'], '1970-01-01T00:00:00')
        self.assertEqual(job['end'], '1970-01-01T01:00:00')
        self.assertEqual(job['elapsed'], 3600)
        self.assertEqual(job['req_tres'], 'cpu=1')
        self.assertEqual(job['alloc_tres'], 'cpu=1')
        self.assertEqual(job['state'], 'COMPLETED')

    def test_export_summary_negative_rate(self):
        usage = {
            '2023-10': {
                'acct': {'core_hours': 10.0, 'users': {}}
            }
        }

        def fake_open(path, *args, **kwargs):
            if path.endswith('rates.json'):
                return io.StringIO('{"defaultRate": -0.02}')
            return open_orig(path, *args, **kwargs)

        open_orig = open
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]), mock.patch(
            'builtins.open', side_effect=fake_open
        ):
            db = SlurmDB()
            with self.assertRaises(ValueError):
                db.export_summary('2023-10-01', '2023-10-31')

    def test_export_summary_invalid_discount(self):
        usage = {
            '2023-10': {
                'acct': {'core_hours': 10.0, 'users': {}}
            }
        }

        def fake_open(path, *args, **kwargs):
            if path.endswith('rates.json'):
                return io.StringIO('{"overrides": {"acct": {"discount": 1.5}}}')
            return open_orig(path, *args, **kwargs)

        open_orig = open
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]), mock.patch(
            'builtins.open', side_effect=fake_open
        ):
            db = SlurmDB()
            with self.assertRaises(ValueError):
                db.export_summary('2023-10-01', '2023-10-31')

    def test_export_summary_negative_discount(self):
        usage = {
            '2023-10': {
                'acct': {'core_hours': 10.0, 'users': {}}
            }
        }

        def fake_open(path, *args, **kwargs):
            if path.endswith('rates.json'):
                return io.StringIO('{"overrides": {"acct": {"discount": -0.1}}}')
            return open_orig(path, *args, **kwargs)

        open_orig = open
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]), mock.patch(
            'builtins.open', side_effect=fake_open
        ):
            db = SlurmDB()
            with self.assertRaises(ValueError):
                db.export_summary('2023-10-01', '2023-10-31')

    def test_export_summary_projected_revenue(self):
        usage = {
            '2024-02': {
                'acct': {'core_hours': 10.0, 'users': {}}
            }
        }

        def fake_open(path, *args, **kwargs):
            if path.endswith('rates.json'):
                return io.StringIO('{"defaultRate": 0.02, "clusterCores": 100}')
            return open_orig(path, *args, **kwargs)

        open_orig = open
        with mock.patch.object(
            SlurmDB,
            'aggregate_usage',
            return_value=(usage, {'daily': {}, 'monthly': {}, 'yearly': {}}),
        ), mock.patch.object(SlurmDB, 'fetch_invoices', return_value=[]), mock.patch(
            'builtins.open', side_effect=fake_open
        ):
            db = SlurmDB()
            summary = db.export_summary('2024-02-01', '2024-02-29')
        self.assertAlmostEqual(summary['summary']['projected_revenue'], 1392.0)


if __name__ == '__main__':
    unittest.main()
