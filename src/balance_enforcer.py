#!/usr/bin/env python3
"""
SlurmLedger Balance Tools

The primary enforcement mechanism is the Lua job_submit plugin
(job_submit.lua) which checks allocations at job submission time.

This script provides:
  --check      Report allocation status for all accounts
  --reconcile  Compare SLURM limits with SlurmLedger allocations
  --sync       Push allocation limits to SLURM GrpTRESMins (alternative to Lua)

Usage:
  # Check all accounts and report:
  python3 balance_enforcer.py --check

  # Check and emit JSON (used by Cockpit dashboard):
  python3 balance_enforcer.py --check --json

  # Reconcile SLURM GrpTRESMins with SlurmLedger allocations:
  python3 balance_enforcer.py --reconcile

  # Push allocation limits to SLURM via sacctmgr (alternative to Lua):
  python3 balance_enforcer.py --sync
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


def get_grptres_limit(account):
    """Get the current GrpTRESMins cpu limit for a SLURM account.

    Returns the limit in core-minutes, or None if no limit is set.
    """
    cmd = [
        'sacctmgr', 'show', 'account', account,
        'format=GrpTRESMins', '--noheader', '--parsable2'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        line = result.stdout.strip()
        if not line:
            return None
        # Format: "cpu=N,mem=..."
        for part in line.split(','):
            if part.startswith('cpu='):
                val = part.split('=', 1)[1]
                return int(val) if val.lstrip('-').isdigit() else None
        return None
    except Exception:
        return None


def set_account_limit(account, max_su):
    """Set GrpTRESMins limit on a SLURM account to enforce budget.

    This uses SLURM's native resource limit mechanism. Jobs submitted after
    the cumulative CPU-minutes are exhausted will be held in PENDING state
    with reason AssocGrpCPUMinutesLimit.
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


def check_allocations():
    """Report allocation status for all prepaid accounts."""
    allocations = load_allocations()
    if not allocations:
        logging.info("No allocations configured")
        return []

    results = []
    now = datetime.utcnow()

    for account, alloc in allocations.items():
        if alloc.get('type') != 'prepaid':
            continue

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

        # Add carryover if configured
        carryover = alloc.get('carryover_su', 0)
        if carryover > 0:
            budget_su += carryover

        remaining_su = budget_su - used_su
        percent_used = (used_su / budget_su * 100) if budget_su > 0 else 0

        alerts = alloc.get('alerts', [80, 90, 100])

        if percent_used >= 100:
            status = 'exceeded'
        elif alerts and percent_used >= max(alerts):
            status = 'critical'
        elif alerts and percent_used >= min(alerts):
            status = 'warning'
        else:
            status = 'ok'

        result = {
            'account': account,
            'budget_su': budget_su,
            'used_su': round(used_su, 2),
            'remaining_su': round(remaining_su, 2),
            'percent_used': round(percent_used, 1),
            'status': status,
        }
        results.append(result)

        logging.info(f"{account}: {percent_used:.1f}% used "
                     f"({used_su:.0f}/{budget_su:.0f} SU) [{status}]")

    return results


def reconcile_allocations():
    """Compare SLURM GrpTRESMins limits with SlurmLedger allocations.

    Reports discrepancies between what SlurmLedger thinks the limits should
    be and what SLURM actually has configured.
    """
    allocations = load_allocations()
    if not allocations:
        logging.info("No allocations configured")
        return []

    results = []
    now = datetime.utcnow()

    for account, alloc in allocations.items():
        if alloc.get('type') != 'prepaid':
            continue

        budget_su = alloc.get('budget_su', 0)
        carryover = alloc.get('carryover_su', 0)
        total_budget_su = budget_su + carryover

        expected_minutes = int(total_budget_su * 60) if total_budget_su > 0 else None
        actual_minutes = get_grptres_limit(account)

        match = True
        note = 'in sync'

        if expected_minutes is None and actual_minutes is not None:
            match = False
            note = f'unexpected SLURM limit: cpu={actual_minutes}min (no allocation configured)'
        elif expected_minutes is not None and actual_minutes is None:
            match = False
            note = f'no SLURM limit set (expected cpu={expected_minutes}min)'
        elif expected_minutes is not None and actual_minutes != expected_minutes:
            match = False
            note = f'mismatch: SLURM has cpu={actual_minutes}min, expected cpu={expected_minutes}min'

        result = {
            'account': account,
            'budget_su': total_budget_su,
            'expected_grptres_minutes': expected_minutes,
            'actual_grptres_minutes': actual_minutes,
            'match': match,
            'note': note,
        }
        results.append(result)

        icon = 'OK' if match else 'MISMATCH'
        logging.info(f"[{icon}] {account}: {note}")

    return results


def sync_allocations():
    """Push allocation limits to SLURM via sacctmgr.

    This is an alternative to the Lua plugin: it sets GrpTRESMins on each
    prepaid account so SLURM enforces the budget natively. Jobs that would
    exceed the limit are held with reason AssocGrpCPUMinutesLimit.

    Note: this approach is less precise than the Lua plugin because
    GrpTRESMins counts total CPU-minutes consumed since the account was
    last reset, not since the allocation start date.
    """
    allocations = load_allocations()
    if not allocations:
        logging.info("No allocations configured")
        return []

    results = []
    now = datetime.utcnow()

    for account, alloc in allocations.items():
        if alloc.get('type') != 'prepaid':
            continue

        budget_su = alloc.get('budget_su', 0)
        if not budget_su:
            continue

        start_date = alloc.get('start_date', now.strftime('%Y-01-01'))
        end_date = alloc.get('end_date', now.strftime('%Y-12-31'))

        # Only sync active allocations
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            logging.warning(f"Invalid dates for {account}, skipping")
            continue

        if now < start_dt or now > end_dt:
            # Outside allocation window — remove limit
            success = remove_account_limit(account)
            results.append({'account': account, 'action': 'removed_limit', 'success': success})
            continue

        carryover = alloc.get('carryover_su', 0)
        total_budget_su = budget_su + carryover

        success = set_account_limit(account, total_budget_su)
        results.append({
            'account': account,
            'action': 'set_limit',
            'budget_su': total_budget_su,
            'grptres_minutes': int(total_budget_su * 60),
            'success': success,
        })

        status = 'OK' if success else 'FAILED'
        logging.info(f"[{status}] {account}: GrpTRESMins=cpu={int(total_budget_su * 60)} "
                     f"({total_budget_su:.0f} SU)")

    return results


def main():
    parser = argparse.ArgumentParser(
        description='SlurmLedger Balance Tools',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
The primary enforcement mechanism is the Lua job_submit plugin (job_submit.lua).
This script provides reporting and reconciliation support.

Examples:
  %(prog)s --check              # Report allocation status
  %(prog)s --check --json       # JSON output (used by Cockpit dashboard)
  %(prog)s --reconcile          # Compare SLURM limits with allocations
  %(prog)s --sync               # Push allocation limits to SLURM GrpTRESMins
        """
    )
    parser.add_argument('--check', action='store_true',
                        help='Report allocation status for all accounts')
    parser.add_argument('--reconcile', action='store_true',
                        help='Compare SLURM GrpTRESMins limits with SlurmLedger allocations')
    parser.add_argument('--sync', action='store_true',
                        help='Push allocation limits to SLURM via sacctmgr (alternative to Lua)')
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

    if args.check:
        results = check_allocations()
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                print(f"{r['account']:20s} {r['percent_used']:6.1f}% "
                      f"({r['used_su']:.0f}/{r['budget_su']:.0f} SU) [{r['status']}]")

    elif args.reconcile:
        results = reconcile_allocations()
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                icon = 'OK     ' if r['match'] else 'MISMATCH'
                print(f"[{icon}] {r['account']:20s}  {r['note']}")

    elif args.sync:
        results = sync_allocations()
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            for r in results:
                status = 'OK' if r.get('success') else 'FAILED'
                print(f"[{status}] {r['account']:20s}  {r['action']}")

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
