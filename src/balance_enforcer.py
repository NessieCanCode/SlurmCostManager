#!/usr/bin/env python3
"""SlurmLedger Balance Enforcer

Checks account allocations against usage and disables/enables
SLURM accounts based on budget status.

Usage:
  # Check all accounts and report (dry run):
  python3 balance_enforcer.py --check

  # Enforce limits (actually disable/enable accounts):
  python3 balance_enforcer.py --enforce

  # Run as cron (every hour):
  # 0 * * * * /usr/bin/python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --enforce --log /var/log/slurmledger/enforcer.log
"""

import argparse
import json
import logging
import os
import subprocess
import sys
from datetime import datetime

# Configuration paths
RATES_PATH = '/etc/slurmledger/rates.json'
LOG_PATH = '/var/log/slurmledger/enforcer.log'


def load_allocations():
    """Load allocation config from rates.json."""
    try:
        with open(RATES_PATH) as f:
            cfg = json.load(f)
        return cfg.get('allocations', {})
    except Exception as e:
        logging.error(f"Failed to load allocations: {e}")
        return {}


def get_account_usage(account, start_date, end_date):
    """Get core-hours used by account in date range via sacct."""
    cmd = [
        'sacct', '-a', '-A', account,
        '--starttime', start_date,
        '--endtime', end_date,
        '--format=CPUTimeRAW', '--noheader', '--parsable2', '-X'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        total_seconds = 0
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                try:
                    total_seconds += int(line.strip())
                except ValueError:
                    continue
        return total_seconds / 3600.0  # Convert to core-hours (SUs)
    except Exception as e:
        logging.error(f"Failed to get usage for {account}: {e}")
        return 0.0


def get_account_status(account):
    """Check if SLURM account is currently enabled."""
    cmd = ['sacctmgr', 'show', 'account', account, 'format=Account,Description',
           '--noheader', '--parsable2']
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return 'active' if result.stdout.strip() else 'unknown'
    except Exception:
        return 'unknown'


def set_account_limit(account, max_su):
    """Set GrpTRESMins limit on a SLURM account to enforce budget.

    This uses SLURM's native resource limit mechanism rather than
    disabling accounts entirely, which is more graceful.
    """
    # Convert SU (core-hours) to core-minutes for SLURM
    max_minutes = int(max_su * 60)
    cmd = [
        'sacctmgr', 'modify', 'account', account,
        'set', f'GrpTRESMins=cpu={max_minutes}',
        '--immediate', '-Q'  # quiet, no confirmation prompt
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            logging.info(f"Set GrpTRESMins for {account} to cpu={max_minutes}")
            return True
        else:
            logging.error(f"sacctmgr failed for {account}: {result.stderr}")
            return False
    except Exception as e:
        logging.error(f"Failed to set limit for {account}: {e}")
        return False


def remove_account_limit(account):
    """Remove GrpTRESMins limit from a SLURM account."""
    cmd = [
        'sacctmgr', 'modify', 'account', account,
        'set', 'GrpTRESMins=cpu=-1',
        '--immediate', '-Q'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0:
            logging.info(f"Removed GrpTRESMins limit for {account}")
            return True
        else:
            logging.error(f"sacctmgr failed for {account}: {result.stderr}")
            return False
    except Exception as e:
        logging.error(f"Failed to remove limit for {account}: {e}")
        return False


def check_and_enforce(dry_run=True):
    """Check all allocations and optionally enforce limits."""
    allocations = load_allocations()
    if not allocations:
        logging.info("No allocations configured")
        return []

    results = []
    now = datetime.utcnow()

    for account, alloc in allocations.items():
        if alloc.get('type') != 'prepaid':
            continue  # Only enforce prepaid allocations

        budget_su = alloc.get('budget_su', 0)
        if not budget_su:
            continue

        start_date = alloc.get('start_date', now.strftime('%Y-01-01'))
        end_date = alloc.get('end_date', now.strftime('%Y-12-31'))

        # Check if allocation is active
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        if now < start_dt or now > end_dt:
            continue

        # Get current usage
        used_su = get_account_usage(account, start_date, now.strftime('%Y-%m-%d'))
        remaining_su = budget_su - used_su
        percent_used = (used_su / budget_su * 100) if budget_su > 0 else 0

        # Add carryover if configured
        carryover = alloc.get('carryover_su', 0)
        if carryover > 0:
            budget_su += carryover
            remaining_su = budget_su - used_su
            percent_used = (used_su / budget_su * 100) if budget_su > 0 else 0

        status = 'ok'
        action = 'none'
        alerts = alloc.get('alerts', [80, 90, 100])

        if percent_used >= 100:
            status = 'exceeded'
            action = 'enforce_limit'
        elif percent_used >= max(alerts) if alerts else 100:
            status = 'critical'
            action = 'warn'
        elif percent_used >= min(alerts) if alerts else 80:
            status = 'warning'
            action = 'warn'

        result = {
            'account': account,
            'budget_su': budget_su,
            'used_su': round(used_su, 2),
            'remaining_su': round(remaining_su, 2),
            'percent_used': round(percent_used, 1),
            'status': status,
            'action': action,
        }
        results.append(result)

        if dry_run:
            logging.info(f"[DRY RUN] {account}: {percent_used:.1f}% used "
                         f"({used_su:.0f}/{budget_su:.0f} SU) — {action}")
        else:
            if action == 'enforce_limit':
                # Set the SLURM account limit to the budget
                # SLURM will reject new jobs when the limit is reached
                set_account_limit(account, budget_su)
                logging.warning(f"ENFORCED: {account} at {percent_used:.1f}% — "
                                f"GrpTRESMins set to {budget_su} SU")
            elif status == 'ok' or remaining_su > budget_su * 0.05:
                # Remove limit if well under budget (>5% remaining)
                # This handles the case where budget was increased
                pass  # Don't auto-remove limits — admin decision

    return results


def main():
    parser = argparse.ArgumentParser(description='SlurmLedger Balance Enforcer')
    parser.add_argument('--check', action='store_true', help='Check allocations (dry run)')
    parser.add_argument('--enforce', action='store_true', help='Enforce allocation limits')
    parser.add_argument('--log', default=None, help='Log file path')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()

    # Setup logging
    log_path = args.log or LOG_PATH
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(message)s',
        handlers=[
            logging.FileHandler(log_path),
            logging.StreamHandler(sys.stderr)
        ]
    )

    if args.enforce:
        results = check_and_enforce(dry_run=False)
    elif args.check:
        results = check_and_enforce(dry_run=True)
    else:
        parser.print_help()
        sys.exit(1)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            print(f"{r['account']:20s} {r['percent_used']:6.1f}% "
                  f"({r['used_su']:.0f}/{r['budget_su']:.0f} SU) [{r['status']}]")


if __name__ == '__main__':
    main()
