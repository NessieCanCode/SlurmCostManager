# Upgrading SlurmLedger

## Config Schema Changes

### v1.1.0 (Sprint 5-6)
- `rates.json`: Added `allocations`, `billing_rules`, `billing_defaults` sections
- `institution.json`: Added `roles`, `bankInfo`, `paymentTerms`, `paymentTermsDays`
- NEW: `financial_config.json` — financial integration settings (was in institution.json)
- NEW: `invoices.json` — invoice ledger (auto-created)

### v1.0.0 (Initial)
- `rates.json`: `defaultRate`, `defaultGpuRate`, `overrides`, `historicalRates`, `historicalGpuRates`
- `institution.json`: Institution profile only

## Migration Guide
Existing `rates.json` files from v1.0.0 continue to work — new fields default gracefully.
If you had `financialIntegration` in `institution.json`, move it to `financial_config.json`.
