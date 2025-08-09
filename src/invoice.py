#!/usr/bin/env python3
"""Generate a PDF invoice for recharge services.

Reads invoice information from JSON provided on standard input and writes the
resulting PDF as a base64 encoded string to standard output. Institution
profile details are pulled from ``institution.json`` in the same directory to
populate billing information.
"""
import base64
import io
import json
import os
import sys
from datetime import datetime

# Reportlab is required for PDF generation. If it's missing, emit a clear
# error message on stderr so callers can surface the failure to users.
try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
    )
except ModuleNotFoundError as exc:  # pragma: no cover - exercised via JS
    print(str(exc), file=sys.stderr)
    sys.exit(1)


def _load_profile(base_dir):
    """Load institution profile information."""
    path = os.path.join(base_dir, "institution.json")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def _profile_sections(profile):
    """Construct From and To sections from the profile."""
    contact = profile.get("primaryContact", {})
    address_line = profile.get("streetAddress", "")
    city = profile.get("city", "")
    state = profile.get("state", "")
    postal = profile.get("postalCode", "")
    country = profile.get("country", "")
    city_state_postal = f"{city}, {state} {postal}".strip(', ')

    from_info = [
        profile.get("departmentName") or profile.get("institutionName", ""),
        address_line,
        city_state_postal,
        country,
        f"Phone: {contact.get('phone', '')}",
        f"Email: {contact.get('email', '')}"
    ]

    to_info = [
        profile.get("institutionName", ""),
        profile.get("institutionAbbreviation", ""),
        profile.get("campusDivision", ""),
        address_line,
        city_state_postal,
        country,
        f"Primary Contact: {contact.get('fullName', '')}, {contact.get('title', '')}",
        f"Email: {contact.get('email', '')} | Phone: {contact.get('phone', '')}"
    ]

    # Remove empty lines
    return ([line for line in from_info if line.strip()],
            [line for line in to_info if line.strip()])


def generate_invoice(buffer, invoice_data):
    """Create the PDF invoice into ``buffer``."""
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="RightAlign", parent=styles["Normal"], alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="Heading", parent=styles["Heading1"], fontSize=16, spaceAfter=10))
    styles.add(ParagraphStyle(name="SubHeading", parent=styles["Heading2"], fontSize=12, spaceAfter=8))

    elements = []
    elements.append(Paragraph("Recharge Services Invoice", styles["Heading"]))
    elements.append(Spacer(1, 12))

    header_table_data = [
        [
            f"Invoice Number: {invoice_data['invoice_number']}",
            f"Date Issued: {invoice_data['date_issued']}",
        ],
        [
            f"Fiscal Year: {invoice_data['fiscal_year']}",
            f"Due Date: {invoice_data['due_date']}",
        ],
    ]
    header_table = Table(header_table_data, colWidths=[250, 250])
    elements.append(header_table)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>From (Billed By)</b>", styles["SubHeading"]))
    for line in invoice_data["from_info"]:
        elements.append(Paragraph(line, styles["Normal"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("<b>To (Billed To)</b>", styles["SubHeading"]))
    for line in invoice_data["to_info"]:
        elements.append(Paragraph(line, styles["Normal"]))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("<b>Invoice Summary</b>", styles["SubHeading"]))
    table_data = [["Description", "Billing Period", "Qty / Units", "Rate", "Amount"]]
    for item in invoice_data["items"]:
        table_data.append(
            [
                item["description"],
                item["period"],
                item["qty_units"],
                item["rate"],
                item["amount"],
            ]
        )
    table_data += [
        ["", "", "", "<b>Subtotal</b>", f"${invoice_data['subtotal']:.2f}"],
        ["", "", "", "<b>Tax</b>", f"${invoice_data['tax']:.2f}"],
        ["", "", "", "<b>Total Due</b>", f"<b>${invoice_data['total_due']:.2f}</b>"],
    ]
    table = Table(table_data, colWidths=[180, 120, 90, 70, 70])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (-2, -3), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Payment Instructions", styles["SubHeading"]))
    for line in invoice_data["bank_info"]:
        elements.append(Paragraph(line, styles["Normal"]))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph("Notes", styles["SubHeading"]))
    elements.append(Paragraph(invoice_data["notes"], styles["Normal"]))

    elements.append(Spacer(1, 20))
    elements.append(
        Paragraph(
            "Generated by Recharge Management System on "
            + datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            + ". Based on usage records from Monthly Summary Reports and Detailed Transactions modules.",
            styles["Normal"],
        )
    )

    doc.build(elements)


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    profile = _load_profile(base_dir)
    invoice_data = json.load(sys.stdin)

    # Fill in profile-based sections if not provided
    from_info, to_info = _profile_sections(profile)
    invoice_data.setdefault("from_info", from_info)
    invoice_data.setdefault("to_info", to_info)

    buffer = io.BytesIO()
    generate_invoice(buffer, invoice_data)
    buffer.seek(0)
    pdf_bytes = buffer.read()
    sys.stdout.write(base64.b64encode(pdf_bytes).decode("ascii"))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
