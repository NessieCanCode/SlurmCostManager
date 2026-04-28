# SlurmLedger — Personas

**Sprint S — 2026-04-27**
**Author:** Jared (Chief of Staff)

This document defines who SlurmLedger is for. It is intentionally brief. Its purpose is to
give Dinesh a target when writing code, Monica a target when writing copy, and the founder
a check against scope creep: if a feature does not serve one of these personas, it needs
a strong justification to ship.

---

## Primary persona — v0.1.0

**Alex, HPC Center Admin at a mid-size research university**

Alex runs a 500-node cluster at a state university. The cluster serves about 40 research
groups across biology, chemistry, physics, and engineering. Alex's title is something like
"HPC Systems Administrator" or "Research Computing Engineer." Alex reports to a director
who reports to the VP for Research.

Alex's billing problem today: the university runs a recharge model where research groups
buy Service Units (core-hours) at the start of each fiscal year. When allocations run out,
groups are supposed to stop submitting jobs — but enforcement is manual. Alex runs a
cron job that dumps sacct output to a CSV every night, pastes it into a spreadsheet, and
emails PIs when they are getting close to their limit. Invoice generation is done by the
research computing office's admin coordinator, who also uses a spreadsheet. It takes
about a day per billing cycle.

Alex is not primarily a developer. Alex can read Python and edit JSON config files, but
does not want to maintain custom code. Alex will try something if it installs via `dnf`
on Rocky Linux 9 and does not require standing up a separate database or web server.
Alex already has Cockpit — it came with the cluster.

Alex's definition of success: allocation limits are enforced automatically at submission,
PIs can see their own usage without calling Alex, and the monthly invoice takes 10 minutes
instead of a day.

**What Alex needs from SlurmLedger v0.1.0:**
- Install via RPM on Rocky Linux 9 in under 30 minutes
- Billing data loads automatically from SlurmDB — no manual import
- Allocation enforcement works without a cron job
- PIs can log into Cockpit and see their group's usage and remaining balance
- Monthly invoice is a PDF with the institution logo that Alex can email directly to the PI

---

## Secondary persona — v0.1.0

**Jordan, Research Computing Finance Coordinator**

Jordan works in the research computing office alongside Alex. Jordan's job is to handle
the financial side: generating invoices, tracking payment status, reconciling charges
with the institutional ERP (usually Banner or Workday), and answering PI questions about
their bills.

Jordan is not technical. Jordan does not SSH into servers. Jordan uses Cockpit from a
browser, and her access is the Finance role: read-only on everything except invoice
lifecycle actions (mark as sent, mark as paid).

Jordan's definition of success: invoices are in the system when Alex generates them, Jordan
can see payment status, and she can export the data to paste into Banner without reformatting.

**What Jordan needs from SlurmLedger v0.1.0:**
- Finance role login with appropriate access restrictions
- Invoice list with status (Draft / Sent / Paid) filterable by date and account
- PDF download for sending to PIs
- CSV export for ERP reconciliation

---

## Out-of-scope personas for v0.1.0

These are real users SlurmLedger could serve in the future but are explicitly not the
target for the first release.

**Large national lab / multi-cluster operator.** Needs multi-cluster federation, centralized
billing across sites, and direct Oracle Financials or XDMOD integration. This persona
requires features that are deferred to v0.2+ (Oracle export, webhook connectors).

**Commercial multi-tenant cloud with Slurm backend.** Needs external user authentication,
tenant isolation, and a billing API that integrates with their own payment processing.
SlurmLedger is a Cockpit plugin — it delegates auth to Cockpit/PAM. A commercial cloud
operator needs a fundamentally different auth model. Not the target.

**PI / end user (self-service).** PIs and members have read-only views in the current
role model. SlurmLedger is primarily an admin and finance tool, not a self-service portal
for researchers. Future versions may improve the PI experience but it is not the v0.1.0
priority.

---

## Primary persona statement (one sentence)

SlurmLedger is for the HPC center admin who needs allocation enforcement and professional
invoicing on their existing Slurm cluster, without standing up new infrastructure.
