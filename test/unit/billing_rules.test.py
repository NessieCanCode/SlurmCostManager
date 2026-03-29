#!/usr/bin/env python3
"""Unit tests for SlurmDB billing rules engine (_apply_billing_rules)."""

import unittest
from unittest import mock
from slurmdb import SlurmDB


def _make_db():
    """Return a SlurmDB instance with connection and config loading mocked out."""
    with mock.patch.object(SlurmDB, '_validate_config'), \
         mock.patch.object(SlurmDB, '_load_cluster_name', return_value='test'), \
         mock.patch.object(SlurmDB, '_load_config', return_value={}):
        db = SlurmDB(host='localhost', user='slurm', database='slurm_acct_db')
    return db


class BillingRulesApplyTests(unittest.TestCase):
    """Tests for _apply_billing_rules."""

    def setUp(self):
        self.db = _make_db()

    # ------------------------------------------------------------------
    # no_charge rule
    # ------------------------------------------------------------------

    def test_no_charge_rule_zeroes_cost(self):
        """A matching no_charge rule must return charge=False."""
        rules = [
            {
                'enabled': True,
                'name': 'free-jobs',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
            }
        ]
        job = {'partition': 'debug', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertFalse(result.get('charge', True))
        self.assertEqual(result.get('reason'), 'free-jobs')

    def test_no_charge_rule_does_not_match_other_partition(self):
        """A no_charge rule must NOT fire when the condition doesn't match."""
        rules = [
            {
                'enabled': True,
                'name': 'free-debug',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
            }
        ]
        job = {'partition': 'compute', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertTrue(result.get('charge', True))

    # ------------------------------------------------------------------
    # discount rule
    # ------------------------------------------------------------------

    def test_discount_rule_applies_percentage(self):
        """A matching discount rule must return the correct discount_percent."""
        rules = [
            {
                'enabled': True,
                'name': 'student-discount',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'students'},
                'action': 'discount',
                'discount_percent': 25,
            }
        ]
        job = {'partition': 'students', 'state': 'COMPLETED', 'elapsed': 7200}
        result = self.db._apply_billing_rules(job, rules)
        self.assertTrue(result.get('charge', True))
        self.assertEqual(result.get('discount_percent'), 25)
        self.assertEqual(result.get('reason'), 'student-discount')

    def test_discount_rule_default_percent_is_zero(self):
        """A discount rule with no discount_percent key must default to 0."""
        rules = [
            {
                'enabled': True,
                'name': 'zero-discount',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'gpu'},
                'action': 'discount',
            }
        ]
        job = {'partition': 'gpu', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertEqual(result.get('discount_percent'), 0)

    # ------------------------------------------------------------------
    # disabled rule is skipped
    # ------------------------------------------------------------------

    def test_disabled_rule_is_skipped(self):
        """A rule with enabled=False must never fire regardless of match."""
        rules = [
            {
                'enabled': False,
                'name': 'disabled-no-charge',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
            }
        ]
        job = {'partition': 'debug', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        # Rule is disabled — should fall through to default (charge=True)
        self.assertTrue(result.get('charge', True))

    def test_rule_without_enabled_key_defaults_to_enabled(self):
        """A rule that omits 'enabled' must be treated as enabled."""
        rules = [
            {
                'name': 'implicit-enabled',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
            }
        ]
        job = {'partition': 'debug', 'state': 'COMPLETED', 'elapsed': 0}
        result = self.db._apply_billing_rules(job, rules)
        self.assertFalse(result.get('charge', True))

    # ------------------------------------------------------------------
    # first-match-wins
    # ------------------------------------------------------------------

    def test_first_match_wins_with_overlapping_rules(self):
        """When multiple rules match, only the first one must be applied."""
        rules = [
            {
                'enabled': True,
                'name': 'rule-a',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'shared'},
                'action': 'no_charge',
            },
            {
                'enabled': True,
                'name': 'rule-b',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'shared'},
                'action': 'discount',
                'discount_percent': 50,
            },
        ]
        job = {'partition': 'shared', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        # rule-a fires first
        self.assertFalse(result.get('charge', True))
        self.assertEqual(result.get('reason'), 'rule-a')

    def test_second_rule_fires_when_first_does_not_match(self):
        """The second rule must fire when the first rule's condition fails."""
        rules = [
            {
                'enabled': True,
                'name': 'gpu-free',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'gpu'},
                'action': 'no_charge',
            },
            {
                'enabled': True,
                'name': 'cpu-discount',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'cpu'},
                'action': 'discount',
                'discount_percent': 10,
            },
        ]
        job = {'partition': 'cpu', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertTrue(result.get('charge', True))
        self.assertEqual(result.get('discount_percent'), 10)
        self.assertEqual(result.get('reason'), 'cpu-discount')

    # ------------------------------------------------------------------
    # exclude_states
    # ------------------------------------------------------------------

    def test_exclude_states_prevents_rule_from_firing(self):
        """A rule must be skipped when the job state is in exclude_states."""
        rules = [
            {
                'enabled': True,
                'name': 'debug-free',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
                'exclude_states': ['FAILED', 'TIMEOUT'],
            }
        ]
        # Job failed — rule should be skipped
        job = {'partition': 'debug', 'state': 'FAILED', 'elapsed': 100}
        result = self.db._apply_billing_rules(job, rules)
        self.assertTrue(result.get('charge', True))

    def test_exclude_states_does_not_block_non_excluded_state(self):
        """A job whose state is NOT in exclude_states must still match the rule."""
        rules = [
            {
                'enabled': True,
                'name': 'debug-free',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
                'exclude_states': ['FAILED', 'TIMEOUT'],
            }
        ]
        job = {'partition': 'debug', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertFalse(result.get('charge', True))

    def test_empty_exclude_states_does_not_block_rule(self):
        """An empty exclude_states list must not block the rule from firing."""
        rules = [
            {
                'enabled': True,
                'name': 'always-free',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'debug'},
                'action': 'no_charge',
                'exclude_states': [],
            }
        ]
        job = {'partition': 'debug', 'state': 'FAILED', 'elapsed': 60}
        result = self.db._apply_billing_rules(job, rules)
        self.assertFalse(result.get('charge', True))

    # ------------------------------------------------------------------
    # use_requested_time
    # ------------------------------------------------------------------

    def test_use_requested_time_returns_correct_flag(self):
        """A charge_requested_time action must set use_requested_time=True."""
        rules = [
            {
                'enabled': True,
                'name': 'charge-wallclock',
                'condition': {'field': 'partition', 'operator': 'equals', 'value': 'preempt'},
                'action': 'charge_requested_time',
            }
        ]
        job = {'partition': 'preempt', 'state': 'PREEMPTED', 'elapsed': 600}
        result = self.db._apply_billing_rules(job, rules)
        self.assertTrue(result.get('charge', True))
        self.assertTrue(result.get('use_requested_time'))
        self.assertEqual(result.get('reason'), 'charge-wallclock')

    def test_use_requested_time_in_build_account_details(self):
        """_build_account_details must use timelimit when use_requested_time fires."""
        # Job ran for 600 s (0.1666 h) on 4 CPUs = 0.6667 core-hours.
        # Rule charges at requested time: timelimit=120 min = 2 h → 4 CPUs × 2 h = 8 core-hours.
        usage = {
            '2024-01': {
                'acct': {
                    'core_hours': 4 * 600 / 3600.0,
                    'gpu_hours': 0.0,
                    'users': {
                        'u1': {
                            'core_hours': 4 * 600 / 3600.0,
                            'gpu_hours': 0.0,
                            'jobs': {
                                '42': {
                                    'core_hours': 4 * 600 / 3600.0,
                                    'gpu_hours': 0.0,
                                    'job_name': 'test',
                                    'partition': 'preempt',
                                    'start': '2024-01-01T00:00:00',
                                    'end': '2024-01-01T00:10:00',
                                    'elapsed': 600,
                                    'req_tres': 'cpu=4',
                                    'alloc_tres': 'cpu=4',
                                    'state': 'PREEMPTED',
                                    'timelimit': 120,  # 120 minutes
                                }
                            },
                        }
                    },
                }
            }
        }
        rates_cfg = {
            'defaultRate': 1.0,
            'defaultGpuRate': 0.0,
            'billing_rules': [
                {
                    'enabled': True,
                    'name': 'charge-wallclock',
                    'condition': {
                        'field': 'partition',
                        'operator': 'equals',
                        'value': 'preempt',
                    },
                    'action': 'charge_requested_time',
                }
            ],
        }
        db = _make_db()
        details, total_ch, total_gpu, total_cost = db._build_account_details(usage, rates_cfg)
        job_entry = details[0]['users'][0]['jobs'][0]
        # 120 min / 60 = 2 h; 4 CPUs derived from core_hours / elapsed_hours
        # 4 × 2 × $1.00 = $8.00
        self.assertAlmostEqual(job_entry['cost'], 8.0, places=2)
        self.assertIn('requested time', job_entry['billing_rule_applied'])

    def test_use_requested_time_fallback_when_no_timelimit(self):
        """_build_account_details must fall back to 'Charged' if timelimit is 0."""
        usage = {
            '2024-01': {
                'acct': {
                    'core_hours': 1.0,
                    'gpu_hours': 0.0,
                    'users': {
                        'u1': {
                            'core_hours': 1.0,
                            'gpu_hours': 0.0,
                            'jobs': {
                                '99': {
                                    'core_hours': 1.0,
                                    'gpu_hours': 0.0,
                                    'job_name': 'nolimit',
                                    'partition': 'preempt',
                                    'start': '2024-01-01T00:00:00',
                                    'end': '2024-01-01T01:00:00',
                                    'elapsed': 3600,
                                    'req_tres': 'cpu=1',
                                    'alloc_tres': 'cpu=1',
                                    'state': 'PREEMPTED',
                                    'timelimit': 0,  # no timelimit set
                                }
                            },
                        }
                    },
                }
            }
        }
        rates_cfg = {
            'defaultRate': 1.0,
            'defaultGpuRate': 0.0,
            'billing_rules': [
                {
                    'enabled': True,
                    'name': 'charge-wallclock',
                    'condition': {
                        'field': 'partition',
                        'operator': 'equals',
                        'value': 'preempt',
                    },
                    'action': 'charge_requested_time',
                }
            ],
        }
        db = _make_db()
        details, _, _, _ = db._build_account_details(usage, rates_cfg)
        job_entry = details[0]['users'][0]['jobs'][0]
        # No timelimit — falls back to "Charged" (actual elapsed hours used)
        self.assertEqual(job_entry['billing_rule_applied'], 'Charged')

    # ------------------------------------------------------------------
    # No rules
    # ------------------------------------------------------------------

    def test_no_rules_returns_default_charge(self):
        """With an empty rules list the default charge result must be returned."""
        job = {'partition': 'compute', 'state': 'COMPLETED', 'elapsed': 3600}
        result = self.db._apply_billing_rules(job, [])
        self.assertTrue(result.get('charge', True))
        self.assertEqual(result.get('discount_percent', 0), 0)
        self.assertNotIn('use_requested_time', result)


if __name__ == '__main__':
    unittest.main()
