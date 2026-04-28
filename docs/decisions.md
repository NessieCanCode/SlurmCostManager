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

---

## D2 — Canonical license: MIT

**Date:** 2026-04-27
**Status:** DECIDED
**Owner:** Richard (Technical Co-founder)

### Decision

The canonical license for SlurmLedger is **MIT**. The `LICENSE` file in the repo root is
authoritative and stays as-is. The README's claim of "LGPL-2.1" is wrong and gets fixed
to match.

**Wrong-place fix:** the inconsistency lives in `README.md` line 333 ("LGPL-2.1 — See
[LICENSE]"), not in `LICENSE`. The `slurmledger.spec` (`License: MIT`), the `Makefile`
DEB control (`MIT`), and the actual `LICENSE` file all agree on MIT. Three of four
surfaces are already correct. Fix the README; don't replace the LICENSE.

### Rationale

- **Portfolio consistency.** tunnl is MIT, adaptr is MIT, clustr is MIT/Apache-2.0 dual,
  hpc-ai-tools README says MIT (LICENSE file pending — separate issue, see Follow-up #4).
  Every Sqoia product is permissive. Mixing copyleft (LGPL-2.1) into the portfolio for
  one product creates a legal-review surprise for any institution evaluating multiple
  Sqoia tools at once. The cost of inconsistency is paid by every prospective customer.
- **Adoption surface.** Universities and HPC centers have legal review processes that
  flag GPL-family licenses. MIT clears those reviews in days; LGPL clears in weeks or
  months and sometimes not at all. SlurmLedger's primary persona is a single HPC admin
  who needs to install something quickly without escalating to general counsel. MIT is
  the lowest friction path to that install.
- **Copyleft has near-zero practical defensive value here.** LGPL-2.1's copyleft applies
  to derivatives of the licensed code, with a linking exception that lets you call it
  from non-LGPL code. SlurmLedger ships as a deployed Cockpit plugin (RPM/DEB) installed
  on a cluster head node. Downstream consumers do not link against it as a library —
  they install it. The "viral" effect of LGPL is therefore mostly illusory in this
  packaging model. We would inherit the legal-review tax without inheriting any
  meaningful protection.
- **The `Copyright (c) 2025 Robert Romero` line in `LICENSE` is a separate cleanup.**
  Should be `Copyright (c) 2026 Sqoia Labs LLC` to match adaptr/tunnl. Tracked as
  Follow-up #1.

### Rejected alternatives

| License | Reason rejected |
|---|---|
| LGPL-2.1 | Copyleft creates legal-review tax with no defensive benefit in this packaging model; breaks portfolio consistency. |
| Apache-2.0 | Strictly better than MIT for patent grant, but MIT is what the rest of the portfolio uses and switching one product to Apache creates new inconsistency. The patent-grant benefit is a v1.0+ concern, not a v0.1.0 concern. |
| GPL-3.0 | Strong copyleft would be actively hostile to enterprise/university adoption — the exact buyer we want. |

### Confidence

**High.** The LICENSE file is already MIT, packaging metadata is already MIT, the only
fix is one line in the README. No code-licensing decision is being changed; we are
just making the docs match reality.

### Kill criteria

If a customer or design partner explicitly requires a copyleft license to commit to
adoption (extremely unlikely for HPC billing software), revisit. Until then, MIT
stands.

---

## D3 — First public version: 0.1.0 (with explicit pre-1.0 semver policy)

**Date:** 2026-04-27
**Status:** DECIDED
**Owner:** Richard (Technical Co-founder)

### Decision

The first public tag is **`v0.1.0`**, not `v1.0.0`.

Until `v1.0.0`, SlurmLedger follows pre-1.0 semver:
- Minor bumps (`0.1.0` → `0.2.0`) MAY include breaking changes. Breaking changes will
  be called out in `CHANGELOG.md` under a `### Breaking` heading and in release notes.
- Patch bumps (`0.1.0` → `0.1.1`) MUST be backwards-compatible bug fixes only.
- No deprecation period is required for breaking changes pre-1.0, but breaking changes
  in config file format (`/etc/slurmledger/*.json`) MUST ship with a migration script
  that runs in the `%post` of the RPM and the `postinst` of the DEB. Site admins should
  never have to hand-edit JSON to upgrade across a minor pre-1.0 version.
- `v1.0.0` is cut when we have at least one production deployment at a real HPC center
  that has been live for 30+ days without site-reported correctness issues in the
  billing engine. At that point we commit to full semver discipline (deprecation cycle
  on breaking changes, etc.).

### Rationale

- **Surface area is feature-complete; field validation is not.** The codebase has a
  billing engine, RBAC, packaging, MariaDB integration tests, an enforcement Lua
  plugin, invoice PDF generation. That is not the bar for 1.0. The bar for 1.0 is
  "we know it works at a real site under real load against a real SlurmDB." We have
  zero external users, zero production deployments. Tagging that 1.0 makes a promise
  we cannot back up.
- **Honest signaling beats marketing-driven versioning.** A v1.0.0 with no field
  validation is a credibility problem the first time something breaks. A v0.1.0 with
  a clear "first public release, expect rough edges" message buys us the goodwill to
  iterate fast based on real feedback. Every HPC site admin has lived through "we
  released 1.0 too early" and they are not impressed by it.
- **Portfolio variance is fine; first-version-policy is per-product.** Other Sqoia
  products tagged where they were:
  - `clustr` shipped at v1.0.0 because it was deliberately matured before going
    public — the founder used it personally before tagging.
  - `tunnl` is v1.2.0 because the version carried over from a pre-existing repo.
  - `adaptr` is v0.4.0 because it is genuinely pre-1.0.
  - `hpc-ai-tools` is v1.1.0 because it carried over.
  No portfolio-wide "first version must be X" policy is needed. The right call for
  each product depends on its specific maturity at time of public tag. SlurmLedger,
  with zero deployments, is honestly pre-1.0.
- **The B3/B4 install URL gap (404 on `slurmledger-1.0.0-1.noarch.rpm`) is fixed by
  this decision.** Updating all version references to `0.1.0` and cutting the release
  resolves the broken install path. This is the cheapest path to a working README.

### Rejected alternatives

| Version | Reason rejected |
|---|---|
| `1.0.0` | Implies "API stable, deprecation discipline, mature." We have no field validation. False signal. |
| `0.5.0` (or other split-the-difference) | Cute but meaningless. Pre-1.0 is pre-1.0. The minor digit will get bumped quickly through 0.2/0.3/0.4 as we learn from real deployments — no need to start from a higher floor. |

### Confidence

**High.** Pre-1.0 is the conservative, honest call when we have zero production users.
The downside of being too conservative is asymmetric to the upside of being too
aggressive — we can always bump to 1.0.0 in 6 months when a pilot site has run the
billing engine through a real billing cycle without incident.

### Kill criteria for moving to 1.0.0

- At least one production deployment at a real HPC center, live for 30+ days
- No P1 correctness issues in the billing engine reported during that window
- Config file format stable (no breaking schema changes anticipated for the next year)
- A documented upgrade path from any pre-1.0 to 1.0.0 with migration scripts

---

## D4 — Repo transfer: NessieCanCode/SlurmLedger → sqoia-dev/slurmledger

**Date:** 2026-04-27
**Status:** DECIDED
**Owner:** Richard (Technical Co-founder)

### Decision

**3a — SlurmLedger transfers** from `github.com/NessieCanCode/SlurmLedger` to
`github.com/sqoia-dev/slurmledger` before the `v0.1.0` tag is cut. Repo name
lowercases on transfer to match the portfolio convention (`tunnl`, `adaptr`, `clustr`
are all lowercase under `sqoia-dev`).

**3b — hpc-ai-tools also transfers** from `github.com/NessieCanCode/hpc-ai-tools` to
`github.com/sqoia-dev/hpc-ai-tools`. Same reasoning, same operation. See
`tunnl.sh-docs/docs/decisions.md` D-Portfolio-2 for the portfolio-level entry.

`bc_anythingllm_ollama` stays under `NessieCanCode/` per D-Portfolio-1 — it is a
reference deployment, not a Sqoia product, and the personal-account placement is
consistent with that disposition.

### Rationale

- **Trust signal.** An institutional buyer (HPC center procurement, university IT
  security review, a foundation funder) sees `sqoia-dev/slurmledger` and reads
  "company-owned, supported product." They see `NessieCanCode/SlurmLedger` and have
  to ask "is this the official Sqoia thing or a personal side project?" That question
  is a friction we control with a 60-second `gh repo transfer`.
- **Backwards compatibility is essentially free.** GitHub auto-redirects all old URLs
  (web, git remotes, API) on transfer. `git clone git@github.com:NessieCanCode/SlurmLedger.git`
  will continue to work. Issues, PRs, stars, watchers, and release artifacts all
  follow the repo. The disruption surface is: dev-machine git remotes (one-time
  `git remote set-url origin`), CI secrets keyed to the old org name (none — the
  workflows use `${{ github.repository }}` which updates automatically), and any
  hardcoded URL references in the codebase (a one-shot grep-and-fix).
- **hpc-ai-tools should also move.** It's a maintained Sqoia product with releases,
  not a personal experiment. Leaving it under `NessieCanCode/` while moving
  SlurmLedger creates a new inconsistency (one product moves, the other stays). The
  cost of doing both at once is identical to doing one — `gh repo transfer` runs once
  per repo. Do them together.
- **Decision scope rationale.** This is intentionally a per-product decision, not a
  blanket "everything moves to sqoia-dev." `bc_anythingllm_ollama` was already
  evaluated separately (D-Portfolio-1) and correctly stays under NessieCanCode as a
  non-product reference deployment. The `sqoia-dev/` org is for products; the
  `NessieCanCode/` account is for personal/reference artifacts. Both products move;
  the recipe stays.

### Mechanics

- **Token scope check.** The `gh` CLI on this host is authed as `NessieCanCode` with
  scopes `gist, read:org, repo`. The `repo` scope is sufficient for `gh repo transfer`
  on a repo the authed user owns. The transfer command works without escalation.
- **Lowercasing the name.** GitHub allows renaming the repo as part of transfer
  (the destination spec is `sqoia-dev/slurmledger`, not `sqoia-dev/SlurmLedger`).
  Both `git@github.com:NessieCanCode/SlurmLedger.git` and the case-sensitive
  destination resolve correctly via redirect.
- **Filesystem path rename** (`staging/SlurmCostManager/` → `staging/slurmledger/`)
  is a separate cleanup, not blocking. D1's follow-up already tracks it.

### Rejected alternatives

| Option | Reason rejected |
|---|---|
| Stay under NessieCanCode | Inconsistent with the rest of the product portfolio; weakens institutional trust signal at exactly the moment we want it strongest (pre-v0.1.0 launch). |
| Move SlurmLedger only, leave hpc-ai-tools | Creates a new inconsistency for no benefit. The two transfers are independent operations and equally cheap. |
| Move everything including bc_anythingllm_ollama | Contradicts D-Portfolio-1, which correctly classified it as a non-product reference deployment. The org/account split is meaningful — preserve it. |

### Confidence

**High.** GitHub redirects make this a near-zero-cost operation. The only real risk
is forgetting to update local git remotes, which produces a clear error message and
takes 10 seconds to fix.

### Kill criteria

None. This is a one-way operation that improves portfolio coherence with no
meaningful downside. The redirect mechanism eliminates the only risk
(broken external links).

---

## Follow-up tasks (from D2, D3, D4)

| ID | Task | Owner | Blocking? |
|---|---|---|---|
| FT-D2-1 | Edit `README.md` line 333: change `LGPL-2.1 — See [LICENSE](LICENSE).` to `MIT — See [LICENSE](LICENSE).` | Dinesh | YES — blocks v0.1.0 |
| FT-D2-2 | Edit `LICENSE` line 3: `Copyright (c) 2025 Robert Romero` → `Copyright (c) 2026 Sqoia Labs LLC` to match portfolio | Dinesh | NO — cleanup, not blocker |
| FT-D2-3 | Verify `slurmledger.spec` (`License: MIT`) and `Makefile` DEB control (`MIT`) — both already correct, no action; just confirm during v0.1.0 dry-run packaging | Dinesh | NO — verification |
| FT-D2-4 | Add a `LICENSE` file to `hpc-ai-tools` repo (README claims MIT, but no LICENSE file exists). Separate from this dispatch — flagged for next hpc-ai-tools sprint. | Dinesh (separate dispatch) | NO — cross-product |
| FT-D3-1 | Update all version references from `1.0.0` to `0.1.0`: `manifest.json`, `README.md` install commands (RPM + DEB filenames), `PRODUCTION_SETUP.md` install URL, `slurmledger.spec` `Version:` field, `Makefile` DEB control `Version:` field | Dinesh | YES — blocks v0.1.0 |
| FT-D3-2 | Rewrite `CHANGELOG.md`: remove fabricated `[1.0.0] - 2025-08-04` entry; populate `[Unreleased]` section with actual feature inventory from `scope.md` IN bucket; convert to `[0.1.0] - <release-date>` when tag is cut | Jared (content) → Dinesh (commit) | YES — blocks v0.1.0 |
| FT-D3-3 | Add a `## Versioning` section to `README.md` (or new `VERSIONING.md`) committing to the pre-1.0 semver policy as defined in D3. Site admins need to know what `0.x` → `0.y` means before they install. | Jared (draft) → Dinesh (commit) | NO — should ship with v0.1.0 but not strictly blocking |
| FT-D3-4 | Pin version in `release.yml`: the workflow currently takes a manual `version` input — keep that, but add a CI guard that rejects any tag where the input does not match the version in `manifest.json` and `slurmledger.spec`. Prevents future version drift. | Dinesh | NO — hardening, not blocker |
| FT-D4-1 | Execute `gh repo transfer NessieCanCode/SlurmLedger sqoia-dev` (the new name `slurmledger` is set as part of the transfer; verify lowercase). Token on this host has `repo` scope and is authed as `NessieCanCode` — Richard can run this directly, OR founder runs from their own session. | Richard (preferred) or Founder | YES — blocks v0.1.0 tag |
| FT-D4-2 | After D4-1: update `git remote set-url origin git@github.com:sqoia-dev/slurmledger.git` on every dev machine that has `staging/SlurmCostManager/` checked out | Dinesh | YES — blocks subsequent commits |
| FT-D4-3 | After D4-1: grep the codebase for hardcoded `NessieCanCode/SlurmLedger` references and replace with `sqoia-dev/slurmledger`. Known surfaces: `README.md` clone URL line 92, `PRODUCTION_SETUP.md` install URL line 31, any badge URLs in README, any workflow URLs. | Dinesh | YES — blocks v0.1.0 |
| FT-D4-4 | Execute `gh repo transfer NessieCanCode/hpc-ai-tools sqoia-dev` (keep name lowercase). Same operator as D4-1. | Richard (preferred) or Founder | NO — separate from SlurmLedger v0.1.0, but should ship in same sprint window for portfolio coherence |
| FT-D4-5 | After D4-4: hpc-ai-tools-side cleanup — update README clone URLs, any CI references. Plus the dependent doc updates in `bc_anythingllm_ollama` README and `adaptr` README that already reference `NessieCanCode/hpc-ai-tools` (per D-Portfolio-1 follow-ups FT-1 and FT-3). | Dinesh | NO — cross-product cleanup |
| FT-D4-6 | Filesystem path rename `staging/SlurmCostManager/` → `staging/slurmledger/` on this host. Already tracked in D1 follow-ups; called out here for cross-reference. | Richard or Founder | NO — cosmetic |
