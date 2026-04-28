# Upgrading SlurmLedger

## Config Schema Changes

### v0.1.0 (Initial public release)
- `rates.json`: `defaultRate`, `defaultGpuRate`, `overrides`, `historicalRates`, `historicalGpuRates`,
  `allocations`, `billing_rules`, `billing_defaults`
- `institution.json`: `roles`, `bankInfo`, `paymentTerms`, `paymentTermsDays`
- `financial_config.json`: financial integration settings (separate from institution.json)
- `invoices.json`: invoice ledger (auto-created on first run)

## Migration Guide

No migrations required for v0.1.0 — this is the initial release.

Future minor-version upgrades (`0.1.0` → `0.2.0`) may include config-format breaking changes.
When they do, a migration script will run automatically in the `%post` section of the RPM
and the `postinst` section of the DEB. You should never need to hand-edit JSON to upgrade
across a minor pre-1.0 version. See `CHANGELOG.md` for any `### Breaking` entries before
upgrading.
