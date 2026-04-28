# SlurmLedger — v0.1.0 Readiness Checklist

**Sprint S — 2026-04-27**
**Author:** Jared (Chief of Staff)
**Method:** Cold-read audit of repo as a new user + structure scan. Read-only.

This checklist defines every blocker that must be resolved before tagging v0.1.0. Each
item has a priority (P1 = must fix before tag, P2 = should fix, P3 = nice to have), an
owner, and a status.

---

## P1 — Blockers (must fix before v0.1.0 tag)

### B1 — Screenshots placeholder in README
**File:** `README.md` line 65
**Issue:** The Screenshots section contains exactly one line: `*(Screenshots to be added)*`
No screenshots exist in the repo. A stranger reading this README will not know what the
product looks like. For a UI-heavy Cockpit plugin, this is a significant trust gap.
**Required:** At minimum 3 screenshots — the main dashboard (cost breakdown view), the
invoice list, and the admin rate configuration panel.
**Owner:** Dinesh (generate screenshots from the Docker Compose test environment)
**Status:** OPEN

### B2 — CHANGELOG is a placeholder with a fabricated date
**File:** `CHANGELOG.md`
**Issue:** The only release entry is `[1.0.0] - 2025-08-04` with description
"Initial release of SlurmCostManager." This date is fabricated — the actual first commit
is from late March 2026 based on the git log, and the product is named SlurmLedger, not
SlurmCostManager. There is no history of what was actually built. The Unreleased section
is a one-line placeholder.
**Required:** Rewrite CHANGELOG.md with:
- Remove the fabricated 1.0.0 entry
- Add an [Unreleased] section listing the actual features built (billing engine,
  invoicing, Lua plugin, RPM/DEB packaging, Docker test environment, etc.)
- When v0.1.0 is tagged, the Unreleased section becomes the 0.1.0 entry
**Owner:** Jared (content, since this is a process/docs item) — Dinesh to commit
**Status:** OPEN

### B3 — Version number mismatch: README says 1.0.0, manifest says 1.0.0, but no tag exists
**File:** `README.md` (install commands reference `slurmledger-1.0.0-1.noarch.rpm`),
`manifest.json` (`"version": "1.0.0"`), `CHANGELOG.md` (same)
**Issue:** The install commands in README.md reference a `1.0.0` release that does not
exist on GitHub. There are no tags in the repo at all. A user following the README's
"From RPM" install path will get a 404 from GitHub Releases.
**Required:** Either (a) align all version references to `0.1.0` and cut that as the
first real tag, or (b) cut a `1.0.0` tag if that is the intended first public release.
Recommendation: use `0.1.0` — it is honest that this is the first public release and
sets expectations correctly for a project with no prior tagged history.
**Owner:** Founder (decide version numbering strategy); Dinesh (update version references)
**Status:** OPEN — **decision needed from founder before Dinesh can execute**

### B4 — PRODUCTION_SETUP.md references a non-existent GitHub release URL
**File:** `PRODUCTION_SETUP.md` line 31
**Issue:** `curl -LO https://github.com/NessieCanCode/SlurmLedger/releases/latest/download/slurmledger-1.0.0-1.noarch.rpm`
This URL 404s because no release exists. Anyone following the quickest install path
bounces immediately.
**Owner:** Dinesh (update URL after B3 is resolved and a release is cut)
**Status:** OPEN (blocked on B3)

### B5 — Python version inconsistency
**File:** `README.md` says `Python 3.8+`; `PRODUCTION_SETUP.md` says `Python 3.9+`
**Issue:** These contradict each other. Rocky Linux 8 (still in use at many HPC centers)
ships Python 3.8. Rocky Linux 9 ships Python 3.9. If we want Rocky 8 support, the code
must be validated on 3.8 and the README wins. If we drop Rocky 8, PRODUCTION_SETUP.md
wins and the README must be updated.
**Owner:** TBD-Richard (architectural decision on minimum supported OS); Dinesh (fix
whichever doc is wrong)
**Status:** OPEN

### B6 — GitHub repo is under NessieCanCode, not sqoia-dev
**File:** `README.md` source clone URL: `github.com/NessieCanCode/SlurmLedger`
**Issue:** All other Sqoia Labs products live under `sqoia-dev/`. Having SlurmLedger under
a personal account creates an inconsistent trust signal and complicates CI, release, and
maintenance. Before a public tag, this should be transferred.
**Owner:** TBD-Richard (repo transfer + remote URL updates on all dev machines)
**Status:** OPEN — **do not tag v0.1.0 before this is resolved unless founder explicitly
decides to keep it under NessieCanCode as a personal project rather than a Sqoia product**

---

## P2 — Should fix before v0.1.0 tag

### B7 — CI lint and test steps use `|| true` (failures are silently swallowed)
**File:** `.github/workflows/ci.yml` — multiple steps end with `|| true`
Lines: Python lint, Python unit tests, JS tests, integration tests, security scan
**Issue:** CI always reports green regardless of test or lint failures. This makes CI
meaningless as a quality gate. Before v0.1.0, at minimum the unit tests and db-integration
jobs should be allowed to fail the build. Lint can stay as `|| true` if there are
pre-existing violations, but tests should not.
**Owner:** Dinesh
**Status:** OPEN

### B8 — Release workflow has incorrect git config (github-actions bot author)
**File:** `.github/workflows/release.yml` lines 37-40
**Issue:** The release workflow sets `git config user.name "github-actions"` and
`user.email "github-actions@github.com"` before creating the release tag. Per project
commit rules, all commits and tags must be authored as NessieCanCode. The automated tag
created by the workflow will have the wrong author. Options: use the project's deploy key
with the correct identity, or remove the automated tag creation from the release workflow
and require the founder to push the tag manually before running the workflow.
**Owner:** Dinesh
**Status:** OPEN

### B9 — `manifest.json` requires `cockpit: "142"` but README requires `Cockpit >= 300`
**File:** `manifest.json` line 9; `README.md` line 69
**Issue:** The manifest declares a minimum Cockpit version of 142, but the README requires
300. Cockpit 300 added significant API changes. If the code uses APIs from Cockpit 300+,
the manifest requirement is wrong and will cause silent failures on older Cockpit. If
Cockpit 142 is sufficient, the README requirement is wrong and excludes valid installs.
**Owner:** Dinesh (check what Cockpit API version the JS actually requires; update manifest
or README to match)
**Status:** OPEN

### B10 — `slurmledger.spec` has an empty `%changelog` section
**File:** `slurmledger.spec` last line
**Issue:** RPM spec files require at least one `%changelog` entry or rpmlint will warn.
More importantly, RPM users expect to see what changed in a package.
**Owner:** Dinesh
**Status:** OPEN

### B11 — LICENSE in repo root is MIT; RPM spec and DEB control also say MIT; LGPL-2.1 in README is wrong
**File:** `README.md` last line says `LGPL-2.1 — See LICENSE`; `LICENSE` file is MIT;
`slurmledger.spec` line 6 says `License: MIT`; `Makefile` DEB control says `MIT`
**Issue:** There is a license conflict across docs. The actual LICENSE file is MIT. The
README's license section incorrectly says LGPL-2.1. This must be consistent before any
public release — license inconsistency causes real problems for enterprise users evaluating
the software for adoption.
**Owner:** Founder (decide: MIT or LGPL-2.1?); Dinesh (update the wrong doc)
**Status:** OPEN — **decision needed from founder**

---

## P3 — Nice to have before v0.1.0

### B12 — No `docs/` directory (exists after this sprint)
**Status:** RESOLVED by this sprint. docs/ created with decisions.md, scope.md,
personas.md, v010-readiness.md.

### B13 — No comparison to alternatives in README
**Issue:** HPC centers evaluating SlurmLedger will want to know why not just use XDMOD,
or a spreadsheet, or SLURM's built-in sreport. A brief "How it compares" section in the
README would reduce the evaluation burden.
**Owner:** Jared (content outline); Monica (final positioning in a future sprint)
**Status:** DEFERRED to Monica's positioning sprint

### B14 — `test/vm/` directory exists but is undocumented
**File:** `test/vm/README.md`, `test/vm/Dockerfile`, `test/vm/run`
**Issue:** There is a VM-based test environment alongside the Docker Compose environment.
Its purpose and relationship to the Docker environment is not clear from the README.
**Owner:** Dinesh (add a comment or update the test README)
**Status:** P3, deferred

---

## Summary

| Priority | Count | Blocking v0.1.0? |
|---|---|---|
| P1 | 6 | Yes — all must be resolved |
| P2 | 5 | Should be resolved |
| P3 | 3 | Optional |

**Top 3 blockers by urgency:**

1. **B1 (Screenshots)** — Owner: Dinesh. A UI product with no screenshots will not be
   taken seriously. This is the highest-visibility gap.

2. **B3/B4 (Version + broken install URL)** — Owner: Founder (decision) + Dinesh (execution).
   The first thing someone does after reading the README is try to install. The install
   command 404s. That is an immediate bounce.

3. **B6 (Repo under NessieCanCode not sqoia-dev)** — Owner: TBD-Richard. Publishing a
   product under a personal GitHub account when the portfolio is under sqoia-dev creates
   inconsistency and an ambiguous ownership signal. Resolve before public launch.

---

## Decisions required from founder before Dinesh dispatch

- **B3:** What version number for the first public tag — `0.1.0` or `1.0.0`?
- **B11:** What is the canonical license — MIT or LGPL-2.1? (README says LGPL, LICENSE
  file says MIT, packaging says MIT — pick one.)
