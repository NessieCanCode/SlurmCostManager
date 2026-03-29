#!/usr/bin/env python3
"""Financial backend integration helpers.

Handles export to Journal Entry CSV, Oracle Financials XML, and generic
webhook delivery for invoice events.  Invoked by the frontend via
``cockpit.spawn``.
"""

import argparse
import csv
import io
import json
import logging
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import urllib.request as _urllib_request
import urllib.error as _urllib_error


# ---------------------------------------------------------------------------
# XML indentation compatibility helper (Python 3.8+)
# ---------------------------------------------------------------------------

def _indent_xml(elem: ET.Element, level: int = 0) -> None:
    """Compatible XML indentation for Python 3.8+.

    ``ET.indent`` was added in Python 3.9.  This wrapper falls back to a
    manual recursive implementation so the code works on 3.8 as well.
    """
    try:
        ET.indent(elem, space="  ")
    except AttributeError:
        # Python < 3.9 fallback
        i = "\n" + level * "  "
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = i + "  "
            for child in elem:
                _indent_xml(child, level + 1)
            if not child.tail or not child.tail.strip():  # noqa: F821
                child.tail = i
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = i


# ---------------------------------------------------------------------------
# Journal Entry CSV export
# ---------------------------------------------------------------------------

def _coa_for_account(account: str, coa_map: Dict[str, Any]) -> Dict[str, str]:
    """Return the chart-of-accounts entry for *account*, falling back to default."""
    entry = coa_map.get(account) or coa_map.get("default") or {}
    return {
        "fund": str(entry.get("fund", "")),
        "org": str(entry.get("org", "")),
        "account": str(entry.get("account", "")),
        "program": str(entry.get("program", "")),
    }


def generate_journal_entry_csv(
    invoice: Dict[str, Any],
    coa_map: Dict[str, Any],
) -> str:
    """Return a Journal Entry CSV string for *invoice*.

    Columns: Fund, Org, Account, Program, Amount, Description, Reference
    """
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fund", "Org", "Account", "Program", "Amount", "Description", "Reference"])

    invoice_number = invoice.get("invoice_number", "")
    account_name = invoice.get("account", "")
    coa = _coa_for_account(account_name, coa_map)

    for item in invoice.get("items", []):
        amount = item.get("amount", 0)
        description = item.get("description", "")
        writer.writerow([
            coa["fund"],
            coa["org"],
            coa["account"],
            coa["program"],
            f"{amount:.2f}",
            description,
            invoice_number,
        ])

    return output.getvalue()


# ---------------------------------------------------------------------------
# Oracle Financials XML export
# ---------------------------------------------------------------------------

def generate_oracle_xml(invoice: Dict[str, Any], coa_map: Dict[str, Any]) -> str:
    """Return an Oracle GL Journal Import XML string for *invoice*."""
    root = ET.Element("GlJournalImport")
    header = ET.SubElement(root, "JournalHeader")

    invoice_number = invoice.get("invoice_number", "")
    ET.SubElement(header, "JournalName").text = invoice_number
    ET.SubElement(header, "PeriodName").text = str(invoice.get("period", ""))
    ET.SubElement(header, "CurrencyCode").text = "USD"
    ET.SubElement(header, "Description").text = f"HPC recharge invoice {invoice_number}"

    account_name = invoice.get("account", "")
    coa = _coa_for_account(account_name, coa_map)

    lines = ET.SubElement(header, "JournalLines")
    for idx, item in enumerate(invoice.get("items", []), start=1):
        amount = item.get("amount", 0)
        line = ET.SubElement(lines, "JournalLine")
        ET.SubElement(line, "LineNumber").text = str(idx)
        ET.SubElement(line, "Fund").text = coa["fund"]
        ET.SubElement(line, "Org").text = coa["org"]
        ET.SubElement(line, "Account").text = coa["account"]
        ET.SubElement(line, "Program").text = coa["program"]
        ET.SubElement(line, "EnteredAmount").text = f"{amount:.2f}"
        ET.SubElement(line, "Description").text = str(item.get("description", ""))
        ET.SubElement(line, "Reference").text = invoice_number

    _indent_xml(root)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode")


# ---------------------------------------------------------------------------
# Webhook delivery
# ---------------------------------------------------------------------------

def send_webhook(
    event_type: str,
    invoice_data: Dict[str, Any],
    webhook_url: str,
    api_key: str = "",
) -> None:
    """POST an invoice event to an external financial system.

    Raises :class:`RuntimeError` on HTTP errors so the caller can surface
    feedback to the user.
    """
    if not webhook_url:
        raise ValueError("webhookUrl is not configured")

    payload = {
        "event": event_type,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "invoice": invoice_data,
    }
    body = json.dumps(payload).encode()

    req = _urllib_request.Request(
        webhook_url,
        data=body,
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")

    try:
        with _urllib_request.urlopen(req, timeout=15) as resp:
            status = resp.status
    except _urllib_error.HTTPError as exc:
        raise RuntimeError(f"Webhook delivery failed: HTTP {exc.code} {exc.reason}") from exc
    except _urllib_error.URLError as exc:
        raise RuntimeError(f"Webhook delivery failed: {exc.reason}") from exc

    if status not in range(200, 300):
        raise RuntimeError(f"Webhook delivery failed: HTTP {status}")


# ---------------------------------------------------------------------------
# Generic JSON export
# ---------------------------------------------------------------------------

def generate_json_export(invoice: Dict[str, Any]) -> str:
    """Return a pretty-printed JSON export of the invoice."""
    return json.dumps(invoice, indent=2, default=str)


# ---------------------------------------------------------------------------
# CLI entry point (called by cockpit.spawn from the JS frontend)
# ---------------------------------------------------------------------------

def _load_institution_config(plugin_base: Optional[str] = None) -> Dict[str, Any]:
    import os
    path = os.path.join(plugin_base or os.path.dirname(__file__), "institution.json")
    try:
        with open(path) as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        logging.warning("Could not load institution.json: %s", exc)
        return {}


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING)

    parser = argparse.ArgumentParser(
        description="Financial export helper for SlurmLedger"
    )
    parser.add_argument(
        "--event",
        required=True,
        help="Event type: invoice.created, invoice.sent, invoice.paid, invoice.refunded",
    )
    parser.add_argument(
        "--invoice-id",
        dest="invoice_id",
        required=True,
        help="Invoice ID to look up in the ledger",
    )
    parser.add_argument(
        "--format",
        default="webhook",
        choices=["webhook", "journal_csv", "oracle_xml", "json"],
        help="Export format (default: webhook)",
    )
    parser.add_argument(
        "--ledger",
        default="/etc/slurmledger/invoices.json",
        help="Path to invoices.json ledger",
    )
    parser.add_argument(
        "--plugin-base",
        dest="plugin_base",
        default=None,
        help="Plugin installation directory (for institution.json)",
    )
    args = parser.parse_args()

    try:
        # Load the invoice from the ledger
        try:
            with open(args.ledger) as fh:
                ledger = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            print(json.dumps({"error": type(exc).__name__, "message": str(exc)}))
            sys.exit(1)

        invoices: List[Dict[str, Any]] = ledger.get("invoices", [])
        invoice = next((inv for inv in invoices if inv.get("id") == args.invoice_id), None)
        if invoice is None:
            msg = f"Invoice {args.invoice_id} not found"
            print(json.dumps({"error": "NotFound", "message": msg}))
            sys.exit(1)

        institution = _load_institution_config(args.plugin_base)
        fi_cfg: Dict[str, Any] = institution.get("financialIntegration", {})
        coa_map: Dict[str, Any] = fi_cfg.get("chartOfAccounts", {})

        if args.format == "journal_csv":
            print(generate_journal_entry_csv(invoice, coa_map))
        elif args.format == "oracle_xml":
            print(generate_oracle_xml(invoice, coa_map))
        elif args.format == "json":
            print(generate_json_export(invoice))
        else:
            # webhook
            if not fi_cfg.get("enabled"):
                print(json.dumps({
                    "status": "skipped",
                    "reason": "Financial integration is disabled",
                }))
                sys.exit(0)
            webhook_url = fi_cfg.get("webhookUrl", "")
            api_key = fi_cfg.get("apiKey", "")
            send_webhook(args.event, invoice, webhook_url, api_key)
            print(json.dumps({"status": "ok", "event": args.event, "invoice_id": args.invoice_id}))

    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": type(exc).__name__, "message": str(exc)}))
        sys.exit(1)
