# SlurmCostManager

**SlurmCostManager** is a Cockpit plugin that integrates seamlessly into the Cockpit UI on Linux servers. It provides interactive billing analytics and invoice management for HPC environments using **Slurm** and SlurmDBD.

This repository now includes a responsive Cockpit UI built with React.  The interface pulls live billing data from SlurmDBD using a bundled Python helper and offers summary, detail and invoice views with a built‑in PDF viewer.

## ✅ Features

- **Monthly billing summaries** displayed right in Cockpit’s navigation menu.
- **Invoice dashboards** to view, download, and archive invoice PDFs.
- **Detailed cost drill-downs** (core‑hours, instance‑hours, GB‑month) for per‑account transparency.
- **Historical billing data** accessible from account inception for auditing and trend analysis.
- **Organization-wide views** consolidating charges across all member Slurm accounts.
- **Full-screen sidebar navigation** with an integrated settings dropdown to manage rates, business information, and invoice branding.


## 📁 Project Structure

```text
SlurmCostManager/
├── src/                                   # Source UI code built with React or modern JS
│   ├── invoices/                          # Stored invoice PDFs
│   ├── invoice-schema.json                # Invoice metadata schema
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

## 📦 Packaging

Build RPM and DEB packages for distribution:

```bash
make rpm  # writes an RPM to rpmbuild/RPMS/
make deb  # creates slurmcostmanager_<version>_all.deb
```

Both targets generate `org.cockpit_project.slurmcostmanager.metainfo.xml` and bundle the existing `manifest.json` so the packages can be installed on RPM or DEB based systems.

### Manual verification

1. Run `make devel-install` and confirm that `~/.local/share/cockpit/slurmcostmanager` is a symlink.
2. Open Cockpit at `https://<host>:9090` and verify the **SlurmCostManager** entry appears.
3. When done developing, execute `make devel-uninstall` to remove the symlink.

## 🧭 Versioning and Releases

The project follows [Semantic Versioning](https://semver.org/). All notable changes are recorded in [CHANGELOG.md](CHANGELOG.md) and upgrade notes live in [UPGRADING.md](UPGRADING.md).

To cut a new release:

1. Bump the version in `manifest.json` and update the changelog and upgrade guide.
2. Trigger the **Release** workflow from the GitHub Actions tab and supply the new version number.

The workflow tags the repository, builds packages, and publishes artifacts to GitHub Releases automatically.

## 🌐 Usage

1. On a Linux host with **Cockpit** installed (e.g. CentOS, Fedora, Debian compatible).
2. After `make devel-install`, open your browser to `https://<host>:9090`.
3. Locate **SlurmCostManager** in the sidebar menu.
4. Interact with billing summaries, drill-ins, invoice retrieval, and configure rates directly within Cockpit.

### Fetching real Slurm usage

The `src/slurmdb.py` utility can connect to a running **SlurmDBD** instance and
export usage metrics as JSON. Connection details are automatically scraped from
`/etc/slurm/slurmdbd.conf` (or a custom path specified via the environment
variable `SLURMDB_CONF` or the `--conf` flag). Environment variables
`SLURMDB_HOST`, `SLURMDB_PORT`, `SLURMDB_USER`, `SLURMDB_PASS` and `SLURMDB_DB`
override any values found in the configuration file. The cluster prefix used to
select the job tables is determined from `/etc/slurm/slurm.conf` but can be set
using `SLURM_CLUSTER`, `--cluster` or `--slurm-conf`.


```bash
python3 src/slurmdb.py --start 2024-06-01 --end 2024-06-30 --output billing.json
# optional custom config path
# python3 src/slurmdb.py --start ... --end ... --conf /path/to/slurmdbd.conf --cluster localcluster
```

The resulting `billing.json` file mirrors the structure expected by the
frontend and can be used for local development or offline snapshots.

### Inspecting the database schema

If you need to see which tables and columns are present in your Slurm
accounting database, run the helper script `src/slurm_schema.py`.  It
uses the same connection options as `slurmdb.py` and writes a JSON
mapping of tables to their columns.

```bash
python3 src/slurm_schema.py --output schema.json
# python3 src/slurm_schema.py --conf /path/to/slurmdbd.conf --cluster localcluster
```

The resulting `schema.json` file can be compared with the list of
tables and columns from your deployment.

## 📝 Development Notes

- Your UI components can access system files or commands using `cockpit.file()` and other Cockpit APIs.
- Write integration tests using the Python-based browser automation tools bundled with Cockpit Starter Kit.
- Ensure cross‑OS compatibility by leveraging Cockpit’s built-in CI and test VM infrastructure.

We welcome community contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

**SlurmCostManager** is licensed under **MIT**—see the [LICENSE](LICENSE) file for details.
