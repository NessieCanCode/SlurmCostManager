# SlurmLedger Production Setup Guide

## Prerequisites

- SLURM cluster with SlurmDBD configured (MySQL/MariaDB backend)
- Cockpit installed on the head/admin node
- Root access (for initial setup only)
- Python 3.9+

## Step 1: Install Dependencies

### RHEL/Rocky Linux 9
```bash
sudo dnf install cockpit python3 python3-pymysql
sudo pip3 install reportlab
sudo systemctl enable --now cockpit.socket
```

### Ubuntu 22.04+
```bash
sudo apt install cockpit python3 python3-pymysql python3-reportlab
sudo systemctl enable --now cockpit.socket
```

## Step 2: Install SlurmLedger

### From Release Package
```bash
# Download latest release
curl -LO https://github.com/NessieCanCode/SlurmLedger/releases/latest/download/slurmledger-1.0.0-1.noarch.rpm
sudo dnf install slurmledger-1.0.0-1.noarch.rpm
```

### From Source
```bash
git clone https://github.com/NessieCanCode/SlurmLedger.git
cd SlurmLedger
pip3 install -r requirements.txt
make build
sudo make install
```

## Step 3: Configure File Permissions

```bash
# Create config directory
sudo mkdir -p /etc/slurmledger
sudo mkdir -p /etc/slurmledger/invoices
sudo mkdir -p /var/log/slurmledger

# Copy default configs (only if they don't exist)
sudo cp -n /usr/share/cockpit/slurmledger/rates.json /etc/slurmledger/
sudo cp -n /usr/share/cockpit/slurmledger/institution.json /etc/slurmledger/

# Set permissions
sudo chown -R root:cockpit-ws /etc/slurmledger
sudo chmod 750 /etc/slurmledger
sudo chmod 640 /etc/slurmledger/*.json
sudo chmod 750 /etc/slurmledger/invoices

# Log directory
sudo chown root:root /var/log/slurmledger
sudo chmod 750 /var/log/slurmledger
```

## Step 4: Verify SlurmDB Access

SlurmLedger reads database credentials from `slurmdbd.conf`. Verify the Cockpit user can read it:

```bash
# Check slurmdbd.conf is readable
sudo cat /etc/slurm/slurmdbd.conf | grep StoragePass
# Should show the database password

# Test database connectivity
python3 /usr/share/cockpit/slurmledger/slurmdb.py \
  --start $(date -d '1 month ago' +%Y-%m-%d) \
  --end $(date +%Y-%m-%d) \
  --output - | python3 -m json.tool | head -20
```

If this fails, check:
- `slurmdbd.conf` has correct `StorageHost`, `StorageUser`, `StoragePass`
- MySQL/MariaDB is running and accessible
- The storage user has SELECT access to the `slurm_acct_db` database

## Step 5: Access the Plugin

1. Open a browser to `https://your-server:9090`
2. Log in with an admin account
3. Click "SlurmLedger" in the left navigation
4. The **Setup Wizard** will guide you through initial configuration:
   - **Step 1**: Enter institution details (name, address, contacts)
   - **Step 2**: Set billing rates (CPU rate per core-hour, GPU rate)
   - **Step 3**: Test database connection

## Step 6: Configure Billing Rates

Navigate to **Administration → Rate Configuration**:

1. Set the default CPU rate ($/core-hour). Common range: $0.005 – $0.05
2. Set the default GPU rate ($/GPU-hour). Common range: $0.05 – $0.50
3. Add per-account overrides if needed (e.g., discounted rates for funded groups)
4. Click **Save**

### Historical Rates
If rates changed in the past, add entries in the **Historical Rates** section so retroactive billing is accurate.

## Step 7: Set Up Allocations (Optional)

Navigate to **Administration → Allocations**:

1. For each account, choose:
   - **Pre-paid**: Account has a fixed SU budget. Jobs are blocked when exhausted.
   - **Post-paid**: Account is billed after the fact. No enforcement.
2. Set budget (in Service Units / core-hours)
3. Set allocation period (annual, quarterly, monthly)
4. Configure alert thresholds (default: 80%, 90%, 100%)

## Step 8: Configure Billing Rules

Navigate to **Administration → Billing Rules**:

Default rules (adjust as needed):
- ✅ **No charge for failed jobs** (except OOM and timeout)
- ✅ **No charge for jobs under 1 minute**
- ❌ Debug partition 50% discount (enable if applicable)
- ❌ Visualization partition free (enable if applicable)

## Step 9: Configure Institution Profile

Navigate to **Administration → Institution Profile**:

1. Fill in all required fields (name, address, contacts)
2. Upload institution logo (for invoices)
3. Enter bank/payment details (for invoice footer)
4. Set payment terms (e.g., "Net 30")

## Step 10: Set Up Balance Enforcement (Optional)

For pre-paid allocations, install the cron job:

```bash
# Create cron job for hourly balance checks
sudo tee /etc/cron.d/slurmledger-enforcer << 'EOF'
# SlurmLedger Balance Enforcer — check allocations hourly
0 * * * * root /usr/bin/python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --enforce --log /var/log/slurmledger/enforcer.log
EOF
sudo chmod 644 /etc/cron.d/slurmledger-enforcer

# Test it first (dry run):
sudo python3 /usr/share/cockpit/slurmledger/balance_enforcer.py --check
```

The enforcer uses SLURM's native `GrpTRESMins` limit to cap accounts at their allocation. Jobs submitted after the limit is reached will be held in PENDING state with reason `AssocGrpCPUMinutesLimit`.

## Step 11: Configure Financial Integration (Optional)

Navigate to **Administration → Financial Integration**:

1. Select your ERP system (Oracle Financials, Workday, Banner, Kuali, or Generic Webhook)
2. Enter webhook URL and API key
3. Map SLURM accounts to Chart of Accounts codes
4. Click **Test Connection**

## Step 12: Set Up Roles

Navigate to **Administration → Institution Profile** (roles section in institution.json):

```json
{
    "roles": {
        "admins": ["root", "hpc-admin"],
        "finance": ["billing-dept"],
        "pis": []
    }
}
```

- **Admins**: Full access to all features
- **Finance**: Read-only access to invoices, can mark invoices as paid
- **PIs**: Auto-detected from SLURM account coordinators
- **Members**: Anyone else — sees only their own usage

## Step 13: Generate Your First Invoice

1. Navigate to **Detailed Transactions**
2. Select a month and account
3. Click **Export Invoice**
4. Review the PDF — verify rates, line items, and totals
5. Navigate to **Invoices** to see the invoice in the ledger
6. Click **Mark as Sent** when you send it to the PI

## Step 14: Set Up Backups

```bash
# Daily backup of all SlurmLedger config and data
sudo tee /etc/cron.daily/slurmledger-backup << 'EOF'
#!/bin/bash
BACKUP_DIR=/backup/slurmledger/$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"
cp -a /etc/slurmledger/ "$BACKUP_DIR/"
find /backup/slurmledger/ -maxdepth 1 -mtime +90 -exec rm -rf {} \;
EOF
sudo chmod 755 /etc/cron.daily/slurmledger-backup
```

## Verification Checklist

- [ ] Cockpit accessible at https://server:9090
- [ ] SlurmLedger appears in Cockpit navigation
- [ ] Setup wizard completes successfully
- [ ] Billing data loads for current month
- [ ] Rates are configured (not demo values)
- [ ] Institution profile is complete
- [ ] Test invoice generates with correct branding
- [ ] Invoice numbers are sequential
- [ ] Balance enforcer runs without errors (dry run)
- [ ] Backup cron is active
- [ ] File permissions are correct on /etc/slurmledger/

## Troubleshooting

### "Failed to load data" on first visit
- Check `slurmdbd.conf` is readable by the Cockpit user
- Verify MySQL is running: `systemctl status mariadb`
- Test manually: `python3 slurmdb.py --start 2026-01-01 --end 2026-12-31 --output -`

### Invoice PDF has no logo or bank details
- Complete the Institution Profile in Administration
- Upload a logo (PNG/JPG, under 256KB)
- Fill in the bank/payment information

### Balance enforcer says "No allocations configured"
- Set up allocations in Administration → Allocations
- Only "prepaid" allocations are enforced

### Permission denied on config save
- Check `/etc/slurmledger/` ownership: `ls -la /etc/slurmledger/`
- Should be `root:cockpit-ws 750` for directory, `640` for files
