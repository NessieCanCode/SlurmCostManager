#!/usr/bin/env python3
"""Generate a professional PDF invoice for recharge services.

Reads invoice information from JSON provided on standard input and writes the
resulting PDF as a base64 encoded string to standard output.

The JSON payload is expected to include a top-level ``institution`` object with
contact/address fields and an optional ``logo`` field containing a base64
data URL. Legacy callers that pass ``bank_info`` and ``notes`` directly are
still supported.
"""
import base64
import io
import json
import os
import re
import sys
import logging
import tempfile
from datetime import datetime

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
        Image,
        KeepTogether,
    )
    from reportlab.lib.utils import ImageReader
except ModuleNotFoundError as exc:  # pragma: no cover
    print(str(exc), file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
COLOR_HEADER_BG = colors.HexColor("#1a1a2e")   # dark navy header
COLOR_HEADER_FG = colors.white
COLOR_ALT_ROW = colors.HexColor("#f5f7fa")     # subtle alternating row
COLOR_BORDER = colors.HexColor("#d0d5dd")
COLOR_TOTAL_BG = colors.HexColor("#eef2ff")    # light blue for total row
COLOR_MUTED = colors.HexColor("#6b7280")
COLOR_RULE = colors.HexColor("#e5e7eb")

PAGE_W, PAGE_H = LETTER
MARGIN = 0.6 * inch
CONTENT_W = PAGE_W - 2 * MARGIN


# ---------------------------------------------------------------------------
# Input sanitization
# ---------------------------------------------------------------------------
def sanitize_for_paragraph(text):
    """Strip HTML/XML tags to prevent reportlab markup injection."""
    return re.sub(r'<[^>]+>', '', str(text))


# ---------------------------------------------------------------------------
# Number formatting helpers
# ---------------------------------------------------------------------------
def _fmt_num(val, decimals=2):
    """Format a number with thousands separators."""
    try:
        f = float(val)
    except (TypeError, ValueError):
        return str(val)
    fmt = f"{f:,.{decimals}f}"
    return fmt


def _fmt_currency(val):
    """Format a number as currency with $ prefix."""
    return f"${_fmt_num(val, 2)}"


# ---------------------------------------------------------------------------
# Logo handling
# ---------------------------------------------------------------------------
def _decode_logo(data_url):
    """Decode a base64 data URL to a temporary file path, or return None."""
    if not data_url or not data_url.startswith("data:"):
        return None
    try:
        # data URL format: data:<mime>;base64,<data>
        header, encoded = data_url.split(",", 1)
        raw = base64.b64decode(encoded)
        suffix = ".png"
        if "jpeg" in header or "jpg" in header:
            suffix = ".jpg"
        elif "gif" in header:
            suffix = ".gif"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(raw)
        tmp.close()
        return tmp.name
    except Exception as exc:
        logging.warning("Could not decode logo: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Style factory
# ---------------------------------------------------------------------------
def _make_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["Normal"] = ParagraphStyle(
        "Normal",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#374151"),
    )
    styles["Small"] = ParagraphStyle(
        "Small",
        parent=base["Normal"],
        fontSize=7.5,
        leading=11,
        textColor=COLOR_MUTED,
    )
    styles["BillTo"] = ParagraphStyle(
        "BillTo",
        parent=base["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#374151"),
    )
    styles["Label"] = ParagraphStyle(
        "Label",
        parent=base["Normal"],
        fontSize=7,
        leading=10,
        textColor=COLOR_MUTED,
        spaceAfter=2,
    )
    styles["SectionHead"] = ParagraphStyle(
        "SectionHead",
        parent=base["Normal"],
        fontSize=8,
        leading=11,
        fontName="Helvetica-Bold",
        textColor=COLOR_MUTED,
        spaceAfter=4,
    )
    styles["InvoiceTitle"] = ParagraphStyle(
        "InvoiceTitle",
        parent=base["Normal"],
        fontSize=26,
        leading=30,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a1a2e"),
        alignment=TA_RIGHT,
    )
    styles["FooterText"] = ParagraphStyle(
        "FooterText",
        parent=base["Normal"],
        fontSize=7,
        leading=10,
        textColor=COLOR_MUTED,
        alignment=TA_CENTER,
    )
    return styles


# ---------------------------------------------------------------------------
# Header block: logo + INVOICE title + meta grid
# ---------------------------------------------------------------------------
def _build_header(invoice_data, styles, logo_path):
    """Return flowables for the top header block."""
    institution = invoice_data.get("institution", {})
    dept = institution.get("department") or institution.get("name", "")
    address_parts = [
        institution.get("address", ""),
        ", ".join(filter(None, [institution.get("city", ""), institution.get("state", "")])),
        " ".join(filter(None, [institution.get("postal", ""), institution.get("country", "")])),
    ]
    address_lines = [p for p in address_parts if p.strip()]

    contact = institution.get("contact", {})
    contact_lines = [
        contact.get("email", ""),
        contact.get("phone", ""),
    ]

    # Left column: logo + from address
    left_paras = []
    if logo_path:
        try:
            img = Image(logo_path, width=1.5 * inch, height=0.6 * inch)
            img.hAlign = "LEFT"
            left_paras.append(img)
            left_paras.append(Spacer(1, 6))
        except Exception as exc:
            logging.warning("Could not embed logo: %s", exc)

    left_paras.append(Paragraph("<b>" + sanitize_for_paragraph(dept or "Your Institution") + "</b>", styles["Normal"]))
    for line in address_lines:
        if line.strip():
            left_paras.append(Paragraph(sanitize_for_paragraph(line), styles["Normal"]))
    for line in contact_lines:
        if line.strip():
            left_paras.append(Paragraph(sanitize_for_paragraph(line), styles["Small"]))

    # Right column: INVOICE title + meta
    inv_num = invoice_data.get("invoice_number", "")
    date_issued = invoice_data.get("date_issued", "")
    due_date = invoice_data.get("due_date", "")
    period = invoice_data.get("period", "")
    payment_terms = invoice_data.get("payment_terms", "")

    is_credit_memo = invoice_data.get("is_credit_memo", False)
    title_text = "CREDIT MEMO" if is_credit_memo else "INVOICE"
    right_paras = [
        Paragraph(title_text, styles["InvoiceTitle"]),
        Spacer(1, 8),
    ]

    meta_rows = [
        ("Invoice #:", inv_num),
        ("Date:", date_issued),
        ("Due Date:", due_date),
    ]
    if period:
        meta_rows.append(("Period:", period))
    if payment_terms:
        meta_rows.append(("Terms:", payment_terms))
    if invoice_data.get("original_invoice"):
        meta_rows.append(("Original Invoice:", str(invoice_data["original_invoice"])))

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontSize=8,
        textColor=COLOR_MUTED,
        alignment=TA_RIGHT,
    )
    meta_val_style = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontSize=8,
        fontName="Helvetica-Bold",
        alignment=TA_RIGHT,
    )
    for label, val in meta_rows:
        right_paras.append(
            Table(
                [[Paragraph(label, meta_label_style), Paragraph(sanitize_for_paragraph(val), meta_val_style)]],
                colWidths=[0.9 * inch, 1.5 * inch],
                style=TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                ]),
            )
        )

    col_left_w = CONTENT_W * 0.55
    col_right_w = CONTENT_W * 0.45

    header_table = Table(
        [[left_paras, right_paras]],
        colWidths=[col_left_w, col_right_w],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )

    return [header_table, Spacer(1, 14)]


# ---------------------------------------------------------------------------
# Bill To block
# ---------------------------------------------------------------------------
def _build_bill_to(invoice_data, styles):
    """Return flowables for the Bill To section."""
    institution = invoice_data.get("institution", {})
    contact = institution.get("contact", {})

    bill_to_lines = []
    name_parts = [contact.get("fullName", ""), contact.get("title", "")]
    name_str = ", ".join(sanitize_for_paragraph(p) for p in name_parts if p)
    if name_str:
        bill_to_lines.append(name_str)

    dept = institution.get("department") or institution.get("name", "")
    if dept:
        bill_to_lines.append(sanitize_for_paragraph(dept))

    address_parts = [
        institution.get("address", ""),
        ", ".join(filter(None, [institution.get("city", ""), institution.get("state", "")])),
        " ".join(filter(None, [institution.get("postal", ""), institution.get("country", "")])),
    ]
    for p in address_parts:
        if p.strip():
            bill_to_lines.append(sanitize_for_paragraph(p))

    email = contact.get("email", "")
    if email:
        bill_to_lines.append(sanitize_for_paragraph(email))

    content_paras = [Paragraph("<b>BILL TO</b>", styles["SectionHead"])]
    for line in bill_to_lines:
        content_paras.append(Paragraph(line, styles["BillTo"]))

    # Wrap in a light box
    bill_table = Table(
        [[content_paras]],
        colWidths=[CONTENT_W * 0.5],
        style=TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_ALT_ROW),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )
    return [bill_table, Spacer(1, 16)]


# ---------------------------------------------------------------------------
# Line-items table
# ---------------------------------------------------------------------------
def _build_items_table(invoice_data, styles):
    """Return flowables for the invoice line-items table."""
    col_desc_w = CONTENT_W * 0.40
    col_qty_w = CONTENT_W * 0.18
    col_rate_w = CONTENT_W * 0.18
    col_amt_w = CONTENT_W * 0.24

    header_style = ParagraphStyle(
        "TblHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=COLOR_HEADER_FG,
    )
    cell_style = ParagraphStyle(
        "TblCell",
        parent=styles["Normal"],
        fontSize=9,
    )
    num_style = ParagraphStyle(
        "TblNum",
        parent=styles["Normal"],
        fontSize=9,
        alignment=TA_RIGHT,
    )

    table_data = [[
        Paragraph("Description", header_style),
        Paragraph("Quantity", header_style),
        Paragraph("Rate", header_style),
        Paragraph("Amount", header_style),
    ]]

    items = invoice_data.get("items", [])
    for item in items:
        qty = item.get("qty", 0)
        rate = item.get("rate", 0)
        amount = item.get("amount", 0)
        # Support legacy string format from old callers
        qty_str = _fmt_num(qty) if isinstance(qty, (int, float)) else str(qty)
        rate_str = _fmt_currency(rate) if isinstance(rate, (int, float)) else str(rate)
        amt_str = _fmt_currency(amount) if isinstance(amount, (int, float)) else str(amount)
        table_data.append([
            Paragraph(sanitize_for_paragraph(item.get("description", "")), cell_style),
            Paragraph(qty_str, num_style),
            Paragraph(rate_str, num_style),
            Paragraph(amt_str, num_style),
        ])

    # Subtotal / discount / total rows
    subtotal = invoice_data.get("subtotal", 0)
    discount = invoice_data.get("discount", 0)
    tax = invoice_data.get("tax", 0)
    total_due = invoice_data.get("total_due", subtotal - discount + tax)

    empty_cell = Paragraph("", cell_style)

    sub_style = ParagraphStyle("SubLbl", parent=styles["Normal"], fontSize=9, alignment=TA_RIGHT)
    sub_val_style = ParagraphStyle("SubVal", parent=styles["Normal"], fontSize=9, alignment=TA_RIGHT)
    tot_style = ParagraphStyle(
        "TotLbl", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold", alignment=TA_RIGHT
    )
    tot_val_style = ParagraphStyle(
        "TotVal", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold", alignment=TA_RIGHT
    )

    table_data.append([empty_cell, empty_cell, Paragraph("Subtotal", sub_style), Paragraph(_fmt_currency(subtotal), sub_val_style)])
    if discount:
        disc_str = f"-{_fmt_currency(discount)}"
        table_data.append([empty_cell, empty_cell, Paragraph("Discount", sub_style), Paragraph(disc_str, sub_val_style)])
    if tax:
        table_data.append([empty_cell, empty_cell, Paragraph("Tax", sub_style), Paragraph(_fmt_currency(tax), sub_val_style)])
    table_data.append([empty_cell, empty_cell, Paragraph("Total Due", tot_style), Paragraph(_fmt_currency(total_due), tot_val_style)])

    n_items = len(items)
    n_rows = len(table_data)

    # Build row style commands
    row_styles = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_HEADER_BG),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_HEADER_FG),
        # Grid
        ("GRID", (0, 0), (-1, n_items), 0.25, COLOR_BORDER),
        ("LINEABOVE", (0, n_items + 1), (-1, n_items + 1), 0.5, COLOR_BORDER),
        # Padding
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        # Alignment
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        # Alternating row colour for data rows (skip header)
        # Total row background
        ("BACKGROUND", (2, n_rows - 1), (-1, n_rows - 1), COLOR_TOTAL_BG),
    ]

    # Alternating data rows
    for i in range(1, n_items + 1):
        if i % 2 == 0:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), COLOR_ALT_ROW))

    table = Table(
        table_data,
        colWidths=[col_desc_w, col_qty_w, col_rate_w, col_amt_w],
        style=TableStyle(row_styles),
    )
    return [Paragraph("<b>SERVICES</b>", styles["SectionHead"]), table, Spacer(1, 16)]


# ---------------------------------------------------------------------------
# Payment info + notes section
# ---------------------------------------------------------------------------
def _build_footer_sections(invoice_data, styles):
    """Return flowables for payment info, notes, and separator."""
    elements = []

    bank_info = invoice_data.get("bank_info", [])
    notes = invoice_data.get("notes", "")

    left_col = [Paragraph("<b>PAYMENT INFORMATION</b>", styles["SectionHead"])]
    for line in bank_info:
        if line.strip():
            left_col.append(Paragraph(sanitize_for_paragraph(line), styles["Normal"]))

    right_col = [Paragraph("<b>NOTES</b>", styles["SectionHead"])]
    if notes:
        right_col.append(Paragraph(sanitize_for_paragraph(notes), styles["Normal"]))

    foot_table = Table(
        [[left_col, right_col]],
        colWidths=[CONTENT_W * 0.5, CONTENT_W * 0.5],
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 16),
            ("RIGHTPADDING", (1, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )
    elements.append(foot_table)
    return elements


# ---------------------------------------------------------------------------
# Page footer (page number + generation info)
# ---------------------------------------------------------------------------
def _page_footer(canvas, doc):
    """Draw footer on each page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(COLOR_MUTED)
    footer_text = (
        f"Generated by SlurmLedger  \u00b7  "
        + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        + f"  \u00b7  Page {doc.page}"
    )
    canvas.drawCentredString(PAGE_W / 2, MARGIN * 0.5, footer_text)

    # Thin rule above footer
    canvas.setStrokeColor(COLOR_RULE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, MARGIN * 0.7, PAGE_W - MARGIN, MARGIN * 0.7)
    canvas.restoreState()


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------
def generate_invoice(buffer, invoice_data):
    """Create the PDF invoice into ``buffer``."""
    logo_path = _decode_logo(invoice_data.get("logo", ""))
    styles = _make_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN * 1.4,  # extra bottom margin for footer
    )

    elements = []
    elements.extend(_build_header(invoice_data, styles, logo_path))
    elements.append(HRFlowable(width=CONTENT_W, thickness=0.5, color=COLOR_BORDER, spaceAfter=12))
    elements.extend(_build_bill_to(invoice_data, styles))
    elements.extend(_build_items_table(invoice_data, styles))
    elements.append(HRFlowable(width=CONTENT_W, thickness=0.5, color=COLOR_BORDER, spaceBefore=4, spaceAfter=12))
    elements.extend(_build_footer_sections(invoice_data, styles))

    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)

    # Clean up temp logo file
    if logo_path:
        try:
            os.unlink(logo_path)
        except OSError:
            pass


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate a PDF invoice")
    parser.add_argument(
        "--output-dir",
        metavar="DIR",
        default=None,
        help="If set, save a copy of the generated PDF to this directory "
             "in addition to writing base64-encoded output to stdout.",
    )
    args, _ = parser.parse_known_args()

    invoice_data = json.load(sys.stdin)

    # Legacy fallback: if institution block is missing, try to load from disk
    if "institution" not in invoice_data:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        profile_path = os.path.join(base_dir, "institution.json")
        try:
            with open(profile_path, "r", encoding="utf-8") as fh:
                profile = json.load(fh)
            contact = profile.get("primaryContact", {})
            invoice_data["institution"] = {
                "name": profile.get("institutionName", ""),
                "abbreviation": profile.get("institutionAbbreviation", ""),
                "department": profile.get("departmentName", ""),
                "address": profile.get("streetAddress", ""),
                "city": profile.get("city", ""),
                "state": profile.get("state", ""),
                "postal": profile.get("postalCode", ""),
                "country": profile.get("country", ""),
                "contact": contact,
            }
            if not invoice_data.get("logo") and profile.get("logo"):
                invoice_data["logo"] = profile["logo"]
            if not invoice_data.get("bank_info") and profile.get("bankInfo"):
                invoice_data["bank_info"] = [
                    l.strip() for l in profile["bankInfo"].split("\n") if l.strip()
                ]
            if not invoice_data.get("notes") and profile.get("notes"):
                invoice_data["notes"] = profile["notes"]
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            invoice_data["institution"] = {}

    buffer = io.BytesIO()
    generate_invoice(buffer, invoice_data)
    buffer.seek(0)
    pdf_bytes = buffer.read()

    # Optionally persist the PDF to a server-side directory so it can be
    # retrieved later without re-generation.  The invoice_number is used as
    # the filename so callers can correlate ledger entries with stored files.
    if args.output_dir:
        try:
            os.makedirs(args.output_dir, exist_ok=True)
            invoice_number = invoice_data.get("invoice_number", "unknown")
            # Sanitize invoice_number to avoid path traversal
            safe_name = re.sub(r'[^A-Za-z0-9_\-]', '_', str(invoice_number))
            pdf_path = os.path.join(args.output_dir, f"{safe_name}.pdf")
            with open(pdf_path, "wb") as fh:
                fh.write(pdf_bytes)
            logging.info("Saved invoice PDF to %s", pdf_path)
        except OSError as exc:
            # Non-fatal: log the error but still return the PDF to the caller
            logging.warning("Could not save PDF to %s: %s", args.output_dir, exc)

    sys.stdout.write(base64.b64encode(pdf_bytes).decode("ascii"))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
