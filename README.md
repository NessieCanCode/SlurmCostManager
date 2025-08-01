# SlurmCostManager

**SlurmCostManager** is a Cockpit plugin that integrates seamlessly into the Cockpit UI on Linux servers. It provides interactive billing analytics and invoice management for HPC environments using **Slurm** and SlurmDBD.

This repository now includes a responsive Cockpit UI built with React.  The interface loads mock billing data from `mock-billing.json` using Cockpit APIs and offers summary, detail and invoice views with a built‑in PDF viewer.

## ✅ Features

- **Monthly billing summaries** displayed right in Cockpit’s navigation menu.
- **Invoice dashboards** to view, download, and archive invoice PDFs.
- **Detailed cost drill-downs** (core‑hours, instance‑hours, GB‑month) for per‑account transparency.
- **Historical billing data** accessible from account inception for auditing and trend analysis.
- **Organization-wide views** consolidating charges across all member Slurm accounts.


## 📁 Project Structure

```text
SlurmCostManager/
├── src/                                   # Source UI code built with React or modern JS
│   ├── slurmcostmanager.html              # HTML entrypoint loaded inside Cockpit
│   └── slurmcostmanager.js                # Frontend plugin logic, using cockpit APIs
├── manifest.json                          # Cockpit module metadata, menu registration
├── Makefile                               # Build, devel-install, devel-uninstall, watch, check targets
├── dist/                                  # Bundled output directory for Cockpit to load
├── test/                                  # Integration tests using Cockpit test harness
│   └── check-application                  # Python-based browser tests via DevTools protocol
├── org.cockpit_project.slurmcostmanager.metainfo.xml  # Metadata for packaging
├── README.md                              # Documentation (this file)
└── CONTRIBUTING.md                        # Guidelines for community contributions
```

## 🧰 Installation & Development

Recommend using the **Cockpit Starter Kit** workflow to scaffold and build your plugin:

- Use `make devel-install` to symlink your dist output into `~/.local/share/cockpit/` for live development.
- Use `make devel-uninstall` when finished to remove the development symlink.
- Optionally run `make watch` to rebuild and reinstall whenever files in `src/` change (requires `inotifywait`).
- Run `make build` or `make` to compile and prepare for release.
- Use `make check` to run integration tests via Cockpit's VM-based test system.
Cockpit’s `manifest.json` registers your tool under the main menu. Your UI files will live in `src/`, built via webpack into `dist/`.

### Manual verification

1. Run `make devel-install` and confirm that `~/.local/share/cockpit/slurmcostmanager` is a symlink.
2. Open Cockpit at `https://<host>:9090` and verify the **SlurmCostManager** entry appears.
3. When done developing, execute `make devel-uninstall` to remove the symlink.

## 🌐 Usage

1. On a Linux host with **Cockpit** installed (e.g. CentOS, Fedora, Debian compatible).
2. After `make devel-install`, open your browser to `https://<host>:9090`.
3. Locate **SlurmCostManager** in the sidebar menu.
4. Interact with billing summaries, drill-ins, and invoice retrieval directly within Cockpit.

### Fetching real Slurm usage

The `src/slurmdb.py` utility can connect to a running **SlurmDBD** instance and
export usage metrics as JSON.  Connection parameters are read from the
environment variables `SLURMDB_HOST`, `SLURMDB_PORT`, `SLURMDB_USER`,
`SLURMDB_PASS` and `SLURMDB_DB`.

```bash
python3 src/slurmdb.py --start 2024-06-01 --end 2024-06-30 --output billing.json
```

The resulting `billing.json` file mirrors the structure expected by the
frontend so it can be dropped in place of `mock-billing.json`.

## 📝 Development Notes

- Your UI components can access system files or commands using `cockpit.file()` and other Cockpit APIs.
- Write integration tests using the Python-based browser automation tools bundled with Cockpit Starter Kit.
- Ensure cross‑OS compatibility by leveraging Cockpit’s built-in CI and test VM infrastructure.

We welcome community contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

**SlurmCostManager** is licensed under **MIT**—see the [LICENSE](LICENSE) file for details.
