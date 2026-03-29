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

## Testing

```bash
# Unit tests
make check

# Or individually:
PYTHONPATH=src python -m pytest test/unit/ -v
for f in test/unit/*.test.js; do node "$f"; done

# Lint
flake8 src/*.py
npx eslint src/ test/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

LGPL-2.1 — See [LICENSE](LICENSE).
