Summary:        SlurmLedger Cockpit plugin for SLURM job cost tracking
Name:           slurmledger
Version:        %{version}
Release:        1%{?dist}
License:        MIT
BuildArch:      noarch
Source0:        %{name}-%{version}.tar.gz

Requires:       cockpit
Requires:       python3

%description
SlurmLedger is a Cockpit plugin that provides HPC billing and allocation
management for SLURM clusters. It tracks job costs, generates professional
invoices, manages SU allocations, enforces budgets, and provides role-based
dashboards for admins, finance staff, PIs, and members.

Python dependencies (install via pip if not available as system packages):
  pip3 install pymysql reportlab

%prep
%setup -q

%build
# Nothing to compile — static web assets and Python scripts

%install
install -d %{buildroot}/usr/share/cockpit/%{name}
cp -a * %{buildroot}/usr/share/cockpit/%{name}/
install -d %{buildroot}/etc/%{name}
install -d %{buildroot}/etc/%{name}/invoices
install -d %{buildroot}/var/log/%{name}
cp rates.json %{buildroot}/etc/%{name}/rates.json
cp institution.json %{buildroot}/etc/%{name}/institution.json

%post
pip3 install pymysql reportlab 2>/dev/null || echo "WARNING: Install Python deps manually: pip3 install pymysql reportlab"
systemctl try-restart cockpit 2>/dev/null || true

%files
/usr/share/cockpit/%{name}
%config(noreplace) /etc/%{name}/rates.json
%config(noreplace) /etc/%{name}/institution.json
%dir /etc/%{name}
%dir /etc/%{name}/invoices
%dir /var/log/%{name}

%changelog
