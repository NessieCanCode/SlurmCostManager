# SlurmLedger Compliance Guide

## University Recharge Accounting (OMB 2 CFR 200.468)

SlurmLedger is designed to support compliance with federal cost accounting requirements for university service centers (recharge operations).

### What SlurmLedger Provides
- Documented rate methodology (rates.json with historical rates)
- Per-job cost tracking with audit trail
- Invoice generation with line-item detail
- Rate change history logging
- Sequential invoice numbering
- Billing rules documentation

### What the Institution Must Provide
- Annual rate study and approval documentation
- Cost center setup in institutional ERP
- Backup procedures for /etc/slurmledger/
- Record retention policy (minimum 3 years after grant closeout)
- Internal control documentation for rate changes

### Record Retention
- Invoice PDFs should be stored server-side (future feature)
- Invoice ledger has rolling backups (3 generations)
- Rate change history is maintained in rates.json
- Audit log entries are append-only per invoice

### Recommended Backup
```bash
# Daily backup of config and ledger
cp -a /etc/slurmledger/ /backup/slurmledger/$(date +%Y%m%d)/
```
