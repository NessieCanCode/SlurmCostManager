# SlurmLedger

Full-featured HPC billing and allocation management for SLURM clusters. A Cockpit plugin that provides real-time cost tracking, SU bank management, professional invoicing, and financial system integration.

## Features

### Billing & Cost Tracking
- Real-time cost calculation from SlurmDB
- Per-account, per-user, per-job cost breakdown
- CPU and GPU hour tracking with separate rates
- Historical rate support for accurate retroactive billing
- Configurable billing rules (exclude failed jobs, partition discounts, etc.)

### SU Bank / Allocation Management
- Pre-paid and post-paid billing models
- Annual, quarterly, monthly, or custom allocation periods
- Budget tracking with configurable alert thresholds (80%/90%/100%)
- Carryover rules for unused allocations
- Real-time remaining balance display

### Professional Invoicing
- PDF invoice generation with institutional branding
- Invoice lifecycle management (Draft → Sent → Viewed → Paid)
- Refund support with credit memo generation
- Configurable payment terms and bank details
- Bulk invoice generation by account

### Configurable Billing Rules
- Rule-based charge/no-charge decisions
- Failed jobs (except OOM/timeout) excluded by default
- Partition-level discounts (e.g., debug queue at 50%)
- Short job exclusion (under 1 minute)
- Custom rules with flexible condition operators
- Admin-configurable via UI — no code changes needed

### Financial System Integration
- Oracle Financials Cloud GL Journal Import XML
- Workday, Banner, Kuali support via configurable mappings
- Chart of Accounts mapping (SLURM account → Fund/Org/Account/Program)
- Webhook notifications on invoice events
- Journal Entry CSV export for any ERP system

### Role-Based Access
| Feature | Admin | PI | Member | Finance |
|---|---|---|---|---|
| Dashboard | All accounts | Their accounts | Personal usage | All (read-only) |
| Cost Details | All + edit rates | Their accounts | Their jobs | All (read-only) |
| Rate Config | Full edit | View only | Hidden | View only |
| Allocations | Full edit | View balance | View usage | View all |
| Invoices | Full lifecycle | View theirs | Hidden | View + mark paid |
| Billing Rules | Full edit | View only | Hidden | View only |
| Institution | Full edit | Hidden | Hidden | View only |
| Financial Integration | Full config | Hidden | Hidden | View only |

### Reports & Exports
- Monthly/Quarterly/Annual billing summaries
- CSV export (RFC 4180 compliant)
- PDF invoices and credit memos
- Journal entry exports for financial systems
- Historical cost trend charts
- Job efficiency metrics

## Screenshots

*(Screenshots to be added)*

## Requirements

- Cockpit ≥ 300
- Python 3.8+
- SLURM with SlurmDBD (MySQL/MariaDB backend)
- pymysql
- reportlab

## Installation

### From RPM (RHEL/Rocky/Alma)
```bash
sudo dnf install slurmledger-1.0.0-1.noarch.rpm
sudo systemctl try-restart cockpit
```

### From DEB (Ubuntu/Debian)
```bash
sudo dpkg -i slurmledger_1.0.0-1_all.deb
sudo apt-get install -f  # install dependencies
sudo systemctl try-restart cockpit
```

### From Source
```bash
git clone https://github.com/NessieCanCode/SlurmLedger.git
cd SlurmLedger
pip install -r requirements.txt
make build
sudo make install
```

### Development
```bash
make devel-install  # Links to ~/.local/share/cockpit/
```

## Configuration

### Rates (`/etc/slurmledger/rates.json`)
```json
{
    "defaultRate": 0.01,
    "defaultGpuRate": 0.10,
    "overrides": {
        "physics-lab": { "rate": 0.008, "gpuRate": 0.08, "discount": 0.1 }
    },
    "billing_rules": [...],
    "allocations": {...},
    "billing_defaults": {
        "type": "postpaid",
        "billing_period": "monthly",
        "payment_terms_days": 30
    }
}
```

### Institution Profile (`/etc/slurmledger/institution.json`)
Configure your institution's name, address, logo, bank details, payment terms, and financial system integration through the UI.

### Roles
Configure role assignments in `institution.json`:
```json
{
    "roles": {
        "admins": ["root", "hpc-admin"],
        "finance": ["billing-dept"],
        "pis": []
    }
}
```
PIs are auto-detected from SLURM account coordinator assignments.

### Billing Rules
Rules are evaluated in order — first matching rule wins:

| Rule | Default | Description |
|---|---|---|
| No charge for failed jobs | ✅ Enabled | Failed/cancelled jobs not charged (except OOM and timeout) |
| No charge under 1 minute | ✅ Enabled | Very short jobs excluded |
| Debug partition discount | ❌ Disabled | 50% rate on debug partition |
| Viz partition free | ❌ Disabled | No charge for visualization partition |
| OOM charge at requested time | ❌ Disabled | OOM jobs charged for requested, not actual time |

Create custom rules via the admin UI — no config file editing required.

## Architecture

```
┌─────────────────────────────────────┐
│         Cockpit Web UI              │
│  (React, Chart.js, jsPDF)           │
│                                     │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ │
│  │Dashboard│ │ Invoices │ │Rates │ │
│  │(by role)│ │lifecycle │ │rules │ │
│  └────┬────┘ └────┬─────┘ └──┬───┘ │
│       │           │           │     │
│       ▼           ▼           ▼     │
│  cockpit.spawn() / cockpit.file()   │
└───────────────┬─────────────────────┘
                │
    ┌───────────┼───────────────┐
    ▼           ▼               ▼
┌────────┐ ┌──────────┐ ┌──────────────┐
│slurmdb │ │invoice.py│ │financial_    │
│  .py   │ │(reportlab│ │ export.py    │
│        │ │  PDF gen)│ │(Oracle/CSV/  │
│ MySQL  │ │          │ │ webhooks)    │
│queries │ │          │ │              │
└───┬────┘ └──────────┘ └──────────────┘
    │
    ▼
┌─────────────┐
│  SlurmDB    │
│ (MySQL/     │
│  MariaDB)   │
└─────────────┘
```

## Balance Enforcement

SlurmLedger supports two approaches for enforcing prepaid allocation budgets:

### Recommended: Lua job_submit plugin

The `job_submit.lua` plugin is called by SLURM at job submission time (before the
job is accepted). When a user submits a job that would exceed their account's budget,
the job is rejected immediately with a clear, user-visible error message:

```
$ sbatch my_job.sh
sbatch: error: SlurmLedger: Job rejected — account 'physics-lab' has exceeded its allocation.
  Budget: 500000 SU | Used: 498200 SU | Remaining: 1800 SU
  This job would require ~2400 SU.
  Contact your PI or HPC admin to request additional allocation.
```

Install once per cluster — no cron job required:

```bash
sudo cp /usr/share/cockpit/slurmledger/job_submit.lua /etc/slurm/job_submit.lua
echo "JobSubmitPlugins=lua" >> /etc/slurm/slurm.conf
sudo scontrol reconfigure
```

Set `ENABLE_ENFORCEMENT = false` in the plugin file to switch to audit-only mode
(logs rejections without actually blocking jobs).

### Alternative: GrpTRESMins via sacctmgr

If your site cannot use Lua plugins, `balance_enforcer.py --sync` pushes allocation
limits to SLURM as `GrpTRESMins` on each account. SLURM holds jobs that would exceed
the limit with reason `AssocGrpCPUMinutesLimit`. This approach is less precise (the
counter tracks lifetime CPU-minutes on the account, not allocation-period usage) and
gives users a less informative error message.

```bash
python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --sync
```

### Reporting: balance_enforcer.py --check

`balance_enforcer.py --check` queries sacct to report current usage against each
prepaid allocation. It works regardless of which enforcement approach is active and
is the data source for the **Check Balances** button in the Admin Dashboard.

```bash
# Text report
python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --check

# JSON output (consumed by Cockpit dashboard)
python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --check --json

# Reconcile SLURM GrpTRESMins against SlurmLedger allocations
python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --reconcile
```

The **Check Balances** button in the Admin Dashboard runs `--check --json` and
displays results in a table with per-account budget, usage, remaining SU, and status.

## Local Development & Testing

### Docker Compose (recommended)

Spins up MariaDB loaded with the test fixture, builds a Cockpit container with all dependencies, and runs the full test suite against the real database.

```bash
cd test
./run-local-tests.sh
```

This will:
1. Start MariaDB 10.11 and populate `slurm_acct_db` from the test fixture
2. Build and start the Cockpit container with the plugin mounted read-only
3. Run Python unit tests with `pytest`
4. Run `slurmdb.py` against the live database and print a sample of the JSON output
5. Smoke-test PDF invoice generation
6. Smoke-test the balance enforcer in dry-run mode

Cockpit is available at `http://localhost:9090` once the environment is ready.

To stop the environment:
```bash
docker compose -f test/docker-compose.yml down
```

### Manual unit tests

```bash
# Unit tests only (no database required)
make check

# Or directly:
PYTHONPATH=src python3 -m pytest test/unit/ -v
for f in test/unit/*.test.js; do node "$f"; done

# Lint
flake8 src/*.py
npx eslint src/ test/
```

### Development install (live reload from source)

```bash
make devel-install
# Plugin is now linked at ~/.local/share/cockpit/slurmledger
# Open Cockpit at https://localhost:9090
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security Model

SlurmLedger delegates authentication entirely to Cockpit. Users log in through the Cockpit web interface; the plugin receives the authenticated session and never manages passwords or session tokens itself.

**Role enforcement is UI-level only.** The role system (admin, finance, PI, member) controls which tabs and actions are visible in the browser. The backend Python scripts (`slurmdb.py`, `invoice.py`, `financial_export.py`) run with the OS permissions of the authenticated Cockpit user — they do not enforce roles independently. On most deployments the plugin is used by HPC administrators, so this is acceptable. If you need hard backend enforcement, wrap the scripts with sudo rules.

**API keys and webhook secrets** should be stored in `/etc/slurmledger/financial_config.json` with restricted permissions:

```bash
sudo chown root:cockpit-ws /etc/slurmledger/financial_config.json
sudo chmod 0640 /etc/slurmledger/financial_config.json
```

This file is separate from `institution.json` (which holds non-sensitive configuration) so that access controls can be applied without restricting the rest of the profile.

**SQL injection prevention.** All queries in `slurmdb.py` use parameterized statements (`%s` placeholders with PyMySQL). Identifier values (host, user, database, cluster) are validated against a strict allowlist regex (`^[A-Za-z0-9_]+$`) before use. Date parameters are validated as YYYY-MM-DD before conversion to UNIX timestamps.

**Billing rules engine.** The rules engine in `slurmdb.py` evaluates conditions using a closed set of comparison operators (`=`, `!=`, `<`, `>`, `contains`). User-supplied rule data is never passed to `eval()` or `exec()`. Adding a billing rule through the UI cannot execute arbitrary code.

**Invoice ledger integrity.** The ledger (`/etc/slurmledger/invoices.json`) is written atomically via `ledger_util.py`: a temp file is written with an exclusive `flock`, then renamed into place. Rolling backups (`.bak`, `.bak.1`, `.bak.2`) are maintained automatically. If the ledger is corrupted, the UI displays an error pointing to the backup files.

**Recommended file permissions summary:**

| File | Owner | Mode | Notes |
|---|---|---|---|
| `/etc/slurmledger/institution.json` | root | 0644 | Non-sensitive institution profile |
| `/etc/slurmledger/financial_config.json` | root:cockpit-ws | 0640 | API keys, webhook URL |
| `/etc/slurmledger/invoices.json` | root:cockpit-ws | 0640 | Invoice ledger |
| `/etc/slurmledger/rates.json` | root | 0644 | Billing rates |

## License

LGPL-2.1 — See [LICENSE](LICENSE).
