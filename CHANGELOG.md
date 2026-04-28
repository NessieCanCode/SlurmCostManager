# Changelog

All notable changes to SlurmLedger are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project follows pre-1.0 semver — see `## Versioning` in `README.md`.

---

## [Unreleased]

_Promoted to `[0.1.0]` when the first release tag is cut._

### Added

- **Core billing engine** — real-time cost calculation from SlurmDB (MySQL/MariaDB).
  Per-account, per-user, per-job cost breakdown. CPU-hour and GPU-hour tracking with
  configurable rates. Historical rate support (`rates.json` with timestamped entries).
  Configurable billing rules: failed job exclusion, short job exclusion, partition
  discounts.

- **SU bank / allocation management** — prepaid and postpaid allocation modes.
  Annual/quarterly/monthly/custom allocation periods. Budget tracking with alert
  thresholds at 80%, 90%, and 100%. Carryover rules. Admin dashboard view of all
  account balances.

- **Balance enforcement — Lua job_submit plugin** — real-time job rejection at
  submission via `job_submit.lua`. `ENABLE_ENFORCEMENT` flag for audit-only mode.
  User-visible error messages include remaining balance. Alternative:
  `balance_enforcer.py --sync` for sites that cannot use Lua.

- **PDF invoice generation** — ReportLab-based PDF with institution branding.
  Line items include per-job breakdown, rates, and totals. Invoice lifecycle:
  Draft → Sent → Viewed → Paid. Sequential invoice numbering. Bulk generation
  by account.

- **Credit memos** — refund support with linked credit memos. Adjustments
  reflected in the invoice ledger.

- **Role-based access control** — four roles: Admin, PI, Member, Finance.
  PI auto-detection from Slurm account coordinators. Role-based UI with tabs and
  actions gated by role.

- **Setup wizard** — three-step first-run wizard: institution profile, billing
  rates, DB connection test. Guides new admins through initial configuration without
  editing JSON directly.

- **RPM and DEB packaging** — `make rpm` / `make deb` produce installable packages.
  RPM tested on Rocky Linux 9; DEB for Ubuntu/Debian. Packages handle config
  directory creation and Cockpit restart in `%post` / `postinst`.

- **Billing rules engine** — admin-configurable rule-based charge/no-charge
  decisions. Admin-editable via UI with no config file editing required. Closed
  operator set (no eval/exec security risk).

- **Reports and CSV export** — monthly/quarterly/annual billing summaries.
  RFC 4180 compliant CSV export. Journal entry CSV for ERP import (generic, not
  Oracle-specific).

- **Docker Compose test environment** — `test/vm/` and `docker-compose.yml` for
  local development against a real MariaDB fixture. CI `db-integration` job
  validates `slurmdb.py` against live MariaDB.

- **CI pipeline** — GitHub Actions: lint, unit tests, MariaDB integration tests,
  packaging dry-run. Five jobs: `lint`, `test`, `db-integration`, `package`,
  `security-scan`.
