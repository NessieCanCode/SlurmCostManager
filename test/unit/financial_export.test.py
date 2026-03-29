#!/usr/bin/env python3
"""Unit tests for financial_export.py helper functions."""

import json
import unittest
import xml.etree.ElementTree as ET
from unittest import mock
from urllib.error import URLError

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from financial_export import (
    generate_journal_entry_csv,
    generate_oracle_xml,
    generate_json_export,
    send_webhook,
)


# ---------------------------------------------------------------------------
# Sample data shared across tests
# ---------------------------------------------------------------------------

SAMPLE_INVOICE = {
    "id": "INV-2024-001",
    "invoice_number": "INV-2024-001",
    "account": "physics",
    "period": "2024-01",
    "amount": 1500.00,
    "status": "draft",
    "items": [
        {"description": "Compute hours Jan 2024", "amount": 1200.00},
        {"description": "GPU hours Jan 2024", "amount": 300.00},
    ],
}

SAMPLE_COA_MAP = {
    "physics": {
        "fund": "10000",
        "org": "PHYS",
        "account": "53210",
        "program": "HPC",
    },
    "default": {
        "fund": "10001",
        "org": "DEFAULT",
        "account": "53200",
        "program": "GENERAL",
    },
}


# ---------------------------------------------------------------------------
# generate_journal_entry_csv
# ---------------------------------------------------------------------------

class GenerateJournalEntryCsvTests(unittest.TestCase):

    def test_header_row_present(self):
        """CSV output must start with the expected column headers."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        first_line = result.splitlines()[0]
        self.assertEqual(first_line, "Fund,Org,Account,Program,Amount,Description,Reference")

    def test_row_count_matches_items(self):
        """One data row per invoice item (plus header)."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        lines = [l for l in result.splitlines() if l.strip()]
        self.assertEqual(len(lines), 1 + len(SAMPLE_INVOICE["items"]))

    def test_coa_lookup_by_account(self):
        """COA fields from the matching account entry are written to each row."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        lines = result.splitlines()
        data_row = lines[1]
        self.assertIn("10000", data_row)
        self.assertIn("PHYS", data_row)
        self.assertIn("53210", data_row)
        self.assertIn("HPC", data_row)

    def test_invoice_number_used_as_reference(self):
        """The invoice_number field appears in the Reference column."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        self.assertIn("INV-2024-001", result)

    def test_amount_formatted_to_two_decimal_places(self):
        """Amounts are formatted with exactly two decimal places."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        self.assertIn("1200.00", result)
        self.assertIn("300.00", result)

    def test_missing_coa_mapping_uses_default(self):
        """An account not in the map falls back to the 'default' entry."""
        invoice = dict(SAMPLE_INVOICE, account="unknown_dept")
        result = generate_journal_entry_csv(invoice, SAMPLE_COA_MAP)
        self.assertIn("DEFAULT", result)
        self.assertIn("53200", result)

    def test_missing_coa_mapping_and_no_default_uses_empty_strings(self):
        """When no mapping and no default exist, COA fields are empty strings."""
        invoice = dict(SAMPLE_INVOICE, account="unknown_dept")
        result = generate_journal_entry_csv(invoice, {})
        lines = result.splitlines()
        # All four COA fields should be empty — row starts with commas
        data_row = lines[1]
        parts = data_row.split(",")
        self.assertEqual(parts[0], "")  # Fund
        self.assertEqual(parts[1], "")  # Org
        self.assertEqual(parts[2], "")  # Account
        self.assertEqual(parts[3], "")  # Program

    def test_empty_items_produces_header_only(self):
        """An invoice with no items produces only the header row."""
        invoice = dict(SAMPLE_INVOICE, items=[])
        result = generate_journal_entry_csv(invoice, SAMPLE_COA_MAP)
        lines = [l for l in result.splitlines() if l.strip()]
        self.assertEqual(len(lines), 1)


# ---------------------------------------------------------------------------
# generate_oracle_xml
# ---------------------------------------------------------------------------

class GenerateOracleXmlTests(unittest.TestCase):

    def _parse(self, invoice=None, coa=None):
        xml_str = generate_oracle_xml(
            invoice or SAMPLE_INVOICE,
            coa if coa is not None else SAMPLE_COA_MAP,
        )
        # Strip the XML declaration so ET.fromstring can parse it
        if xml_str.startswith("<?xml"):
            xml_str = xml_str.split("\n", 1)[1]
        return ET.fromstring(xml_str)

    def test_xml_declaration_present(self):
        """Output must begin with an XML 1.0 UTF-8 declaration."""
        result = generate_oracle_xml(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        self.assertTrue(result.startswith('<?xml version="1.0" encoding="UTF-8"?>'))

    def test_root_element_is_gl_journal_import(self):
        """Root element must be GlJournalImport."""
        root = self._parse()
        self.assertEqual(root.tag, "GlJournalImport")

    def test_journal_header_present(self):
        """A JournalHeader child element must exist under the root."""
        root = self._parse()
        header = root.find("JournalHeader")
        self.assertIsNotNone(header)

    def test_journal_name_matches_invoice_number(self):
        """JournalName must equal the invoice_number."""
        root = self._parse()
        journal_name = root.findtext("JournalHeader/JournalName")
        self.assertEqual(journal_name, "INV-2024-001")

    def test_currency_code_is_usd(self):
        """CurrencyCode element must be 'USD'."""
        root = self._parse()
        currency = root.findtext("JournalHeader/CurrencyCode")
        self.assertEqual(currency, "USD")

    def test_line_count_matches_items(self):
        """One JournalLine element per invoice item."""
        root = self._parse()
        lines = root.findall("JournalHeader/JournalLines/JournalLine")
        self.assertEqual(len(lines), len(SAMPLE_INVOICE["items"]))

    def test_line_numbers_are_sequential(self):
        """LineNumber values must be 1, 2, ... in order."""
        root = self._parse()
        lines = root.findall("JournalHeader/JournalLines/JournalLine")
        for idx, line in enumerate(lines, start=1):
            self.assertEqual(line.findtext("LineNumber"), str(idx))

    def test_coa_fields_written_to_lines(self):
        """Fund/Org/Account/Program from COA map appear in each line."""
        root = self._parse()
        first_line = root.find("JournalHeader/JournalLines/JournalLine")
        self.assertEqual(first_line.findtext("Fund"), "10000")
        self.assertEqual(first_line.findtext("Org"), "PHYS")
        self.assertEqual(first_line.findtext("Account"), "53210")
        self.assertEqual(first_line.findtext("Program"), "HPC")

    def test_missing_coa_mapping_uses_default(self):
        """An account not in the map falls back to the 'default' entry."""
        invoice = dict(SAMPLE_INVOICE, account="unknown_dept")
        root = self._parse(invoice=invoice)
        first_line = root.find("JournalHeader/JournalLines/JournalLine")
        self.assertEqual(first_line.findtext("Org"), "DEFAULT")

    def test_amount_formatted_to_two_decimal_places(self):
        """EnteredAmount values carry exactly two decimal places."""
        root = self._parse()
        amounts = [
            line.findtext("EnteredAmount")
            for line in root.findall("JournalHeader/JournalLines/JournalLine")
        ]
        self.assertIn("1200.00", amounts)
        self.assertIn("300.00", amounts)

    def test_valid_xml_structure(self):
        """The full XML string must be parseable without errors."""
        result = generate_oracle_xml(SAMPLE_INVOICE, SAMPLE_COA_MAP)
        # Verify no parse exception is raised
        xml_body = result.split("\n", 1)[1] if result.startswith("<?xml") else result
        root = ET.fromstring(xml_body)
        self.assertIsNotNone(root)


# ---------------------------------------------------------------------------
# generate_json_export
# ---------------------------------------------------------------------------

class GenerateJsonExportTests(unittest.TestCase):

    def test_returns_valid_json(self):
        """Output must be valid JSON."""
        result = generate_json_export(SAMPLE_INVOICE)
        parsed = json.loads(result)
        self.assertIsInstance(parsed, dict)

    def test_invoice_fields_preserved(self):
        """All top-level invoice fields must appear in the exported JSON."""
        result = generate_json_export(SAMPLE_INVOICE)
        parsed = json.loads(result)
        self.assertEqual(parsed["invoice_number"], "INV-2024-001")
        self.assertEqual(parsed["account"], "physics")
        self.assertEqual(parsed["period"], "2024-01")

    def test_items_list_preserved(self):
        """Invoice items list must be preserved in the output."""
        result = generate_json_export(SAMPLE_INVOICE)
        parsed = json.loads(result)
        self.assertEqual(len(parsed["items"]), 2)
        self.assertEqual(parsed["items"][0]["amount"], 1200.00)

    def test_output_is_pretty_printed(self):
        """Output must be indented (pretty-printed), not a single line."""
        result = generate_json_export(SAMPLE_INVOICE)
        self.assertIn("\n", result)

    def test_empty_invoice_produces_empty_object(self):
        """An empty dict invoice produces an empty JSON object."""
        result = generate_json_export({})
        self.assertEqual(json.loads(result), {})


# ---------------------------------------------------------------------------
# send_webhook
# ---------------------------------------------------------------------------

class SendWebhookTests(unittest.TestCase):

    def _make_mock_response(self, status=200):
        resp = mock.MagicMock()
        resp.status = status
        resp.__enter__ = mock.MagicMock(return_value=resp)
        resp.__exit__ = mock.MagicMock(return_value=False)
        return resp

    def test_raises_value_error_when_url_missing(self):
        """send_webhook must raise ValueError when webhookUrl is empty."""
        with self.assertRaises(ValueError):
            send_webhook("invoice.created", SAMPLE_INVOICE, "")

    def test_raises_value_error_when_url_none(self):
        """send_webhook must raise ValueError when webhookUrl is None."""
        with self.assertRaises(ValueError):
            send_webhook("invoice.created", SAMPLE_INVOICE, None)

    def test_raises_runtime_error_on_url_error(self):
        """URLError from urlopen must be re-raised as RuntimeError."""
        with mock.patch(
            "financial_export._urllib_request.urlopen",
            side_effect=URLError("connection refused"),
        ):
            with self.assertRaises(RuntimeError) as ctx:
                send_webhook("invoice.created", SAMPLE_INVOICE, "http://example.com/webhook")
        self.assertIn("Webhook delivery failed", str(ctx.exception))

    def test_raises_runtime_error_on_http_error(self):
        """HTTPError from urlopen must be re-raised as RuntimeError with status code."""
        from urllib.error import HTTPError as _HTTPError
        http_err = _HTTPError(
            url="http://example.com/webhook",
            code=503,
            msg="Service Unavailable",
            hdrs=None,
            fp=None,
        )
        with mock.patch(
            "financial_export._urllib_request.urlopen",
            side_effect=http_err,
        ):
            with self.assertRaises(RuntimeError) as ctx:
                send_webhook("invoice.created", SAMPLE_INVOICE, "http://example.com/webhook")
        self.assertIn("503", str(ctx.exception))

    def test_raises_runtime_error_on_non_2xx_status(self):
        """A non-2xx HTTP status must raise RuntimeError."""
        resp = self._make_mock_response(status=422)
        with mock.patch(
            "financial_export._urllib_request.urlopen",
            return_value=resp,
        ):
            with self.assertRaises(RuntimeError) as ctx:
                send_webhook("invoice.created", SAMPLE_INVOICE, "http://example.com/webhook")
        self.assertIn("422", str(ctx.exception))

    def test_success_does_not_raise(self):
        """A 200 OK response must not raise any exception."""
        resp = self._make_mock_response(status=200)
        with mock.patch(
            "financial_export._urllib_request.urlopen",
            return_value=resp,
        ):
            # Should complete without raising
            send_webhook("invoice.created", SAMPLE_INVOICE, "http://example.com/webhook")

    def test_api_key_added_as_bearer_header(self):
        """When api_key is set, Authorization: Bearer must be sent."""
        resp = self._make_mock_response(status=200)
        captured_request = []

        def fake_urlopen(req, timeout=None):
            captured_request.append(req)
            return resp

        with mock.patch("financial_export._urllib_request.urlopen", side_effect=fake_urlopen):
            send_webhook(
                "invoice.created",
                SAMPLE_INVOICE,
                "http://example.com/webhook",
                api_key="secret-token",
            )

        req = captured_request[0]
        self.assertEqual(req.get_header("Authorization"), "Bearer secret-token")

    def test_no_auth_header_when_api_key_empty(self):
        """When api_key is empty, no Authorization header should be set."""
        resp = self._make_mock_response(status=200)
        captured_request = []

        def fake_urlopen(req, timeout=None):
            captured_request.append(req)
            return resp

        with mock.patch("financial_export._urllib_request.urlopen", side_effect=fake_urlopen):
            send_webhook("invoice.created", SAMPLE_INVOICE, "http://example.com/webhook", api_key="")

        req = captured_request[0]
        self.assertIsNone(req.get_header("Authorization"))


# ---------------------------------------------------------------------------
# COA default fallback (integration across functions)
# ---------------------------------------------------------------------------

class CoaDefaultFallbackTests(unittest.TestCase):
    """Verify that missing chartOfAccounts mapping uses defaults in all exporters."""

    def test_journal_csv_uses_default_when_account_absent(self):
        """Journal CSV uses default COA entry when account is not explicitly mapped."""
        invoice = dict(SAMPLE_INVOICE, account="chemistry")
        result = generate_journal_entry_csv(invoice, SAMPLE_COA_MAP)
        # 'chemistry' is not in map → should use 'default' entry
        self.assertIn("DEFAULT", result)

    def test_oracle_xml_uses_default_when_account_absent(self):
        """Oracle XML uses default COA entry when account is not explicitly mapped."""
        invoice = dict(SAMPLE_INVOICE, account="chemistry")
        result = generate_oracle_xml(invoice, SAMPLE_COA_MAP)
        self.assertIn("DEFAULT", result)

    def test_journal_csv_empty_coa_map_no_exception(self):
        """Journal CSV with empty COA map must not raise an exception."""
        result = generate_journal_entry_csv(SAMPLE_INVOICE, {})
        self.assertIsInstance(result, str)

    def test_oracle_xml_empty_coa_map_no_exception(self):
        """Oracle XML with empty COA map must not raise an exception."""
        result = generate_oracle_xml(SAMPLE_INVOICE, {})
        self.assertIsInstance(result, str)


if __name__ == "__main__":
    unittest.main()
