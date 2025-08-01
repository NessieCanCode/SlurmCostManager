# SlurmCostManager

**SlurmCostManager** is a Cockpit plugin that integrates seamlessly into the Cockpit UI on Linux servers. It provides interactive billing analytics and invoice management for HPC environments using **Slurm** and SlurmDBD.


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
├── Makefile                               # Build, install, devel-install, watch, check targets
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
- Run `make build` or `make` to compile and prepare for release.  
- Use `make check` to run integration tests via Cockpit's VM-based test system :contentReference[oaicite:1]{index=1}.

Cockpit’s `manifest.json` registers your tool under the main menu. Your UI files will live in `src/`, built via webpack into `dist/`.


## 🌐 Usage

1. On a Linux host with **Cockpit** installed (e.g. CentOS, Fedora, Debian compatible).
2. After `make devel-install`, open your browser to `https://<host>:9090`.
3. Locate **SlurmCostManager** in the sidebar menu.
4. Interact with billing summaries, drill-ins, and invoice retrieval directly within Cockpit.

## 📝 Development Notes

- Your UI components can access system files or commands using `cockpit.file()` and other Cockpit APIs.
- Write integration tests using the Python-based browser automation tools bundled with Cockpit Starter Kit.
- Ensure cross‑OS compatibility by leveraging Cockpit’s built-in CI and test VM infrastructure :contentReference[oaicite:2]{index=2}.


## 🤝 Contributing

We welcome community contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.


## 📄 License

**SlurmCostManager** is licensed under **MIT**—see the [LICENSE](LICENSE) file for details.


## 🏷️ Tags

`cockpit`, `slurm`, `hpc`, `billing`, `cost-management`, `plugin`, `open-source`, `javascript`, `react`, `linux-admin`
