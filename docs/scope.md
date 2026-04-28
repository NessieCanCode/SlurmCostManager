# SlurmLedger — v0.1.0 Scope

**Sprint S — 2026-04-27**
**Author:** Jared (Chief of Staff)

This document draws the line for v0.1.0: what ships, what is deferred, and what is out of
scope entirely. Every item is assigned a rationale. Architectural questions marked TBD-Richard
require a call before the decision is locked.

---

## Guiding principle for v0.1.0

v0.1.0 is the first public tag. Its job is to be installable and useful by the primary
persona (see `personas.md`) without requiring enterprise infrastructure. Every IN item
must be testable by a single-person HPC admin with a working Slurm + SlurmDB setup
and a Cockpit install. Every OUT item either requires third-party credentials that most
sites do not have, or adds complexity that delays the first tag without adding core value.

---

## IN — ships with v0.1.0

### Core billing engine
- Real-time cost calculation from SlurmDB (MySQL/MariaDB backend)
- Per-account, per-user, per-job cost breakdown
- CPU-hour and GPU-hour tracking with configurable rates
- Historical rate support (rates.json with timestamped entries)
- Configurable billing rules: failed job exclusion, short job exclusion, partition discounts

**Rationale:** This is the product. Without the billing engine, nothing else works. It is
already implemented and tested with a Docker Compose test environment and a real MariaDB
fixture. CI has a db-integration job that validates `slurmdb.py` against live MariaDB.

### SU bank / allocation management (prepaid + postpaid)
- Allocation configuration (annual/quarterly/monthly/custom periods)
- Budget tracking with alert thresholds (80%/90%/100%)
- Carryover rules
- Admin dashboard view of all account balances

**Rationale:** Allocation management is the second-most-requested feature at HPC centers
after basic billing. Without it, SlurmLedger is a reporting tool, not a management tool.
Already implemented.

### Balance enforcement — Lua job_submit plugin
- `job_submit.lua` plugin for real-time rejection at submission
- `ENABLE_ENFORCEMENT` flag for audit-only mode
- User-visible error messages with remaining balance
- Alternative: `balance_enforcer.py --sync` for sites that cannot use Lua

**Rationale:** This is SlurmLedger's differentiator. Other HPC billing tools (if they exist
at all) are post-facto. Real-time enforcement at submission is the feature that turns
SlurmLedger from "interesting" to "actually useful for prepaid allocation management."
Already implemented. Ships in v0.1.0.

**Note:** The Lua plugin installs separately from the Cockpit plugin and requires Slurm
admin access. This is a deliberate design choice: the enforcement plane is cluster-side,
the management plane is browser-side. They are separate installation steps, and that is fine.

### PDF invoice generation
- ReportLab-based PDF with institution branding
- Line items: per-job breakdown, rates, totals
- Invoice lifecycle: Draft -> Sent -> Viewed -> Paid
- Sequential invoice numbering
- Bulk generation by account

**Rationale:** This is what finance departments actually need. HPC centers currently export
CSVs and manually build invoices in Excel or Google Docs. A one-click PDF invoice with the
institution logo, bank details, and itemized charges is a concrete time-save that justifies
adoption. Already implemented.

### Credit memos
- Refund support with linked credit memos
- Adjustments reflected in invoice ledger

**Rationale:** Any billing system that handles payments must handle corrections. Credit memos
are not optional for a system used by university finance. Already implemented, minimal
complexity to include.

### Role-based access control
- Four roles: Admin, PI, Member, Finance
- PI auto-detection from Slurm account coordinators
- Role-based UI (tabs and actions gated by role)

**Rationale:** Multi-role access is required for the primary persona's workflow.
An HPC center admin needs to give finance staff read access without giving them rate edit
access. PIs need to see their own allocations without seeing other groups. Already
implemented.

### Setup wizard
- Three-step first-run wizard: institution profile, billing rates, DB connection test
- Guides new admins through initial configuration without editing JSON

**Rationale:** The setup wizard directly reduces bounce rate on first install. Without it,
a new admin stares at a blank dashboard and has to figure out that they need to edit
`/etc/slurmledger/rates.json` and then reload. The wizard is already built. It is IN.

### RPM and DEB packaging
- `make rpm` / `make deb` produce installable packages
- RPM tested on Rocky Linux 9; DEB for Ubuntu/Debian
- Packages handle config directory creation and Cockpit restart

**Rationale:** HPC centers run RHEL/Rocky Linux. They do not `git clone` and `pip install`
on prod cluster head nodes. They install packages. This is the only install path that will
see real adoption. Already implemented.

### Billing rules engine (admin-configurable)
- Rule-based charge/no-charge decisions
- Admin-editable via UI, no config file editing required
- Closed operator set (no eval/exec security risk)

**Rationale:** Every HPC center has local policy exceptions. Without a rules engine, every
site requires a code fork. Already implemented.

### Reports and CSV export
- Monthly/Quarterly/Annual billing summaries
- CSV export (RFC 4180 compliant)
- Journal entry CSV for ERP import (generic, not Oracle-specific)

**Rationale:** CSV export is the escape hatch for sites that need to get data into
institutional systems without using a supported ERP integration. It is also how sites
that use Banner or Kuali without a direct connector will process invoices. Already
implemented.

---

## OUT for v0.1.0 — DEFERRED to v0.2+

### Oracle Financials Cloud GL Journal Import XML

**Status:** DEFERRED to v0.2+
**Rationale:** Oracle Financials integration requires: (a) a test Oracle instance, which
we do not have; (b) chart-of-accounts mapping that is highly site-specific; and (c) an
Oracle API key or credentials from the site. This is a high-value feature for large
research universities, but it cannot be tested without a real Oracle installation. Shipping
it untested in v0.1.0 is worse than not shipping it — a broken ERP export will actively
damage trust. Deferred until we have at least one pilot site to validate against.

**TBD-Richard:** Should the `financial_export.py` code be present in the v0.1.0 package
but disabled (behind a feature flag in `financial_config.json`), or removed from the
install entirely until v0.2? The code is already written. The question is whether shipping
disabled code in a first release creates confusion or expectation. Richard should decide
the packaging approach.

### Workday / Banner / Kuali connectors

**Status:** DEFERRED to v0.2+
**Rationale:** Same constraint as Oracle Financials — cannot test without site credentials.
The generic webhook and CSV export in v0.1.0 cover the majority of sites that need ERP
integration. Named connectors require named pilot sites. Deferred.

### Webhook notifications on invoice events

**Status:** DEFERRED to v0.2+
**Rationale:** The webhook notification infrastructure is part of `financial_export.py`.
Deferring along with the ERP integrations. The code exists; it will ship with v0.2 when
the financial integration layer is validated.

### Historical cost trend charts (beyond current period)

**Status:** DEFERRED — included in v0.1.0 within the Cockpit UI as-is, but no
dedicated "historical trends" reporting feature beyond what is in the current Dashboard.
Full trend analytics deferred to v0.2.

---

## OUT entirely — removed from product scope

None at this time. The product scope is coherent and everything in the codebase maps to
a real use case. No features were identified that should be removed rather than deferred.

---

## Summary counts

| Category | Count |
|---|---|
| IN for v0.1.0 | 9 feature groups |
| DEFERRED to v0.2+ | 4 feature groups |
| Removed | 0 |

---

## Open questions (require resolution before v0.1.0 tag)

1. **TBD-Richard:** Oracle Financials and webhook code — disable in place or exclude from
   install package? Decision affects what a new user sees in the Financial Integration tab
   on first install.

2. **TBD-Richard:** Should v0.1.0 require Python 3.9+ (per PRODUCTION_SETUP.md) or
   Python 3.8+ (per README.md)? These are inconsistent. Rocky Linux 8 ships Python 3.8.
   Rocky Linux 9 ships Python 3.9. If we want to support Rocky 8 sites, the minimum is 3.8
   and the code needs to be validated on 3.8. If we drop Rocky 8, require 3.9 and update
   the README.
