Summary:        SlurmLedger Cockpit plugin for SLURM job cost tracking
Name:           slurmledger
Version:        %{version}
Release:        1%{?dist}
License:        MIT
BuildArch:      noarch
Source0:        %{name}-%{version}.tar.gz

Requires:       cockpit
Requires:       python3
Requires:       python3-pymysql
Requires:       python3-reportlab

%description
SlurmLedger is a Cockpit plugin that provides HPC cost management for SLURM
clusters. It tracks job costs, generates invoices, manages allocations, and
provides role-based dashboards for admins, finance staff, PIs, and members.

%prep
%setup -q

%build
# Nothing to compile — static web assets and Python scripts

%install
install -d %{buildroot}/usr/share/cockpit/%{name}
cp -a * %{buildroot}/usr/share/cockpit/%{name}/
install -d %{buildroot}/etc/%{name}
cp rates.json %{buildroot}/etc/%{name}/rates.json
cp institution.json %{buildroot}/etc/%{name}/institution.json

%files
/usr/share/cockpit/%{name}
%config(noreplace) /etc/%{name}/rates.json
%config(noreplace) /etc/%{name}/institution.json

%changelog
