# Product Decisions

Canonical log of product decisions for SlurmLedger. Numbered from D1 in chronological order.
Each entry records what was decided, why, what was rejected, and who owns follow-up.

---

## D1 — Canonical product name: SlurmLedger

**Date:** 2026-04-27
**Status:** DECIDED
**Owner:** Founder

### Decision

The canonical product name is **SlurmLedger**.

The filesystem path (`SlurmCostManager`) and the GitHub repo (`NessieCanCode/SlurmLedger`)
were already split. SlurmLedger is the name used in the README, the Cockpit manifest, the
RPM/DEB package names (`slurmledger`), and the install paths (`/etc/slurmledger`,
`/usr/share/cockpit/slurmledger`). The split was a naming lag, not a deliberate choice.
This decision resolves it in favor of SlurmLedger.

### Rationale

- SlurmLedger is already the operative name in every user-facing surface: the Cockpit sidebar
  label, the package name, the config path, the binary name.
- "Ledger" connotes financial record-keeping, not just cost tabulation — which matches the
  actual scope (invoices, credit memos, audit trails, ERP integration).
- "SlurmCostManager" is accurate but flat. It describes function, not outcome. A finance person
  reads "Ledger" and knows what it is; "CostManager" could mean a config file or a cron job.
- The name is self-explanatory enough: anyone who knows what Slurm is will immediately
  understand SlurmLedger as the billing and financial record system for their cluster.

### Rejected alternatives

| Name | Reason rejected |
|---|---|
| SlurmCostManager | Already the filesystem artifact name. Descriptive but undersells the product. |
| Slurm Treasury | "Treasury" implies cash management and storage, not billing and invoicing. Misleading. |
| Slurm Books | Too informal. Does not translate well across non-English-speaking institutions. |
| ClusterLedger | Decouples from Slurm branding but loses specificity. HPC centers search for "Slurm billing" — being Slurm-named is an SEO and discovery advantage. |

### Follow-up actions

- [x] Lock name in docs (this sprint)
- [ ] Rename GitHub repo from `NessieCanCode/SlurmLedger` to `sqoia-dev/slurmledger`
  (coordinate with Richard — involves repo transfer, remote URL updates on all dev machines,
  and any CI secrets that reference the repo name). **TBD-Richard, before v0.1.0 tag.**
- [ ] Rename local filesystem path from `staging/SlurmCostManager/` to `staging/slurmledger/`
  after repo rename. **TBD-Richard, same sprint as repo rename.**
- [ ] Update CHANGELOG.md: remove the placeholder "SlurmCostManager" entry at 1.0.0 and
  replace with accurate history. **Dinesh, pre-v0.1.0.**

### Sub-domain

SlurmLedger does not require its own domain. It ships as a Cockpit plugin installed on the
customer's own server. The canonical discovery URL will be
`slurmledger.sqoia.dev` (product page under the company domain), consistent with how
hpc-ai-tools and clustr are positioned. No separate SLD purchase needed.
