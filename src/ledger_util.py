#!/usr/bin/env python3
"""Atomic read/modify/write for the invoice ledger with file locking."""
import fcntl
import json
import os
import shutil
import sys

LEDGER_PATH = '/etc/slurmledger/invoices.json'
BACKUP_COUNT = 3

def read_ledger():
    try:
        with open(LEDGER_PATH, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"invoices": []}

def write_ledger(data):
    """Atomic write with backup and file locking."""
    # Create backup
    if os.path.exists(LEDGER_PATH):
        for i in range(BACKUP_COUNT - 1, 0, -1):
            src = f"{LEDGER_PATH}.bak.{i-1}" if i > 1 else f"{LEDGER_PATH}.bak"
            dst = f"{LEDGER_PATH}.bak.{i}"
            if os.path.exists(src):
                shutil.copy2(src, dst)
        shutil.copy2(LEDGER_PATH, f"{LEDGER_PATH}.bak")

    # Atomic write with lock
    tmp_path = LEDGER_PATH + '.tmp'
    with open(tmp_path, 'w') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(data, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    os.rename(tmp_path, LEDGER_PATH)  # atomic on same filesystem

def update_invoice(invoice_id, patch):
    """Update a single invoice by ID with locking."""
    data = read_ledger()
    for inv in data.get('invoices', []):
        if inv.get('id') == invoice_id:
            # State machine validation
            VALID_TRANSITIONS = {
                'draft': ['sent', 'cancelled'],
                'sent': ['viewed', 'paid', 'cancelled'],
                'viewed': ['paid', 'cancelled'],
                'paid': ['refunded'],
                'cancelled': [],
                'refunded': [],
            }
            if 'status' in patch:
                current = inv.get('status', 'draft')
                new_status = patch['status']
                if new_status not in VALID_TRANSITIONS.get(current, []):
                    print(json.dumps({"error": "InvalidTransition",
                        "message": f"Cannot change status from '{current}' to '{new_status}'"}))
                    sys.exit(1)
            inv.update(patch)
            break
    else:
        print(json.dumps({"error": "NotFound", "message": f"Invoice {invoice_id} not found"}))
        sys.exit(1)
    write_ledger(data)
    print(json.dumps({"ok": True}))

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['read', 'add', 'update', 'add-refund'])
    parser.add_argument('--invoice-id', default='')
    args = parser.parse_args()

    if args.action == 'read':
        print(json.dumps(read_ledger()))
    elif args.action == 'update':
        patch = json.load(sys.stdin)
        update_invoice(args.invoice_id, patch)
    elif args.action == 'add':
        invoice = json.load(sys.stdin)
        data = read_ledger()
        data['invoices'].append(invoice)
        write_ledger(data)
        print(json.dumps({"ok": True}))
    elif args.action == 'add-refund':
        refund = json.load(sys.stdin)
        data = read_ledger()
        for inv in data.get('invoices', []):
            if inv.get('id') == args.invoice_id:
                inv.setdefault('refunds', []).append(refund)
                if refund.get('full'):
                    inv['status'] = 'refunded'
                break
        write_ledger(data)
        print(json.dumps({"ok": True}))
