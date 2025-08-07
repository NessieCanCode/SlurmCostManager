DIST=dist
COCKPIT_DEVEL_DIR=$(HOME)/.local/share/cockpit
COCKPIT_PROD_DIR=/usr/share/cockpit
COCKPIT_DEVEL_TARGET=$(COCKPIT_DEVEL_DIR)/slurmcostmanager
COCKPIT_PROD_TARGET=$(COCKPIT_PROD_DIR)/slurmcostmanager
VERSION:=$(shell jq -r .version manifest.json)
DATE:=$(shell date +%Y-%m-%d)
RPMBUILD?=rpmbuild
.RECIPEPREFIX := >

all: build

org.cockpit_project.slurmcostmanager.metainfo.xml: org.cockpit_project.slurmcostmanager.metainfo.xml.in manifest.json
>sed -e "s/@VERSION@/$(VERSION)/" -e "s/@DATE@/$(DATE)/" $< > $@

build: org.cockpit_project.slurmcostmanager.metainfo.xml
>mkdir -p $(DIST)
>cp -r src/* $(DIST)/
>cp manifest.json $(DIST)/
>cp org.cockpit_project.slurmcostmanager.metainfo.xml $(DIST)/
>mkdir -p $(COCKPIT_PROD_DIR)
>ln -sfn $(abspath $(DIST)) $(COCKPIT_PROD_TARGET)

clean:
>rm -rf $(DIST) rpmbuild debbuild slurmcostmanager-*.tar.gz slurmcostmanager_*.deb org.cockpit_project.slurmcostmanager.metainfo.xml

devel-install: build
>mkdir -p $(COCKPIT_DEVEL_DIR)
>ln -sfn $(abspath $(DIST)) $(COCKPIT_DEVEL_TARGET)

devel-uninstall:
>@if [ -L $(COCKPIT_DEVEL_TARGET) ]; then \
>rm $(COCKPIT_DEVEL_TARGET); \
>else \
>echo "No symlink to remove at $(COCKPIT_DEVEL_TARGET)"; \
>fi

watch:
>@command -v inotifywait >/dev/null || { echo "inotifywait not found"; exit 1; }
>@echo "Watching src/ for changes..."
>@while inotifywait -e modify,create,delete -r src/; do \
>make devel-install; \
>done

package: build
>tar -czf slurmcostmanager-$(VERSION).tar.gz -C $(DIST) . --transform 's,^,slurmcostmanager-$(VERSION)/,'

rpm: package
>rm -rf rpmbuild
>mkdir -p rpmbuild/BUILD rpmbuild/RPMS rpmbuild/SOURCES rpmbuild/SPECS rpmbuild/SRPMS
>cp slurmcostmanager-$(VERSION).tar.gz rpmbuild/SOURCES/
>printf 'Summary: Slurm Cost Manager\nName: slurmcostmanager\nVersion: $(VERSION)\nRelease: 1\nLicense: MIT\nSource0: %%{name}-%%{version}.tar.gz\nBuildArch: noarch\nRequires: cockpit\n%%description\nSlurm Cost Manager Cockpit plugin\n%%prep\n%%setup -q\n%%build\n%%install\nmkdir -p %%{buildroot}/usr/share/cockpit/slurmcostmanager\ncp -a * %%{buildroot}/usr/share/cockpit/slurmcostmanager/\n%%files\n/usr/share/cockpit/slurmcostmanager\n' > rpmbuild/SPECS/slurmcostmanager.spec
>$(RPMBUILD) --define "_topdir $(PWD)/rpmbuild" -bb rpmbuild/SPECS/slurmcostmanager.spec

deb: package
>rm -rf debbuild
>mkdir -p debbuild/usr/share/cockpit/slurmcostmanager
>cp -a $(DIST)/* debbuild/usr/share/cockpit/slurmcostmanager/
>mkdir -p debbuild/DEBIAN
>echo "Package: slurmcostmanager\nVersion: $(VERSION)\nSection: admin\nPriority: optional\nArchitecture: all\nMaintainer: Unknown\nDepends: cockpit\nDescription: Slurm Cost Manager Cockpit plugin" > debbuild/DEBIAN/control
>dpkg-deb --build debbuild slurmcostmanager_$(VERSION)_all.deb
>rm -rf debbuild

check:
>./test/check-application

.PHONY: all build clean devel-install devel-uninstall watch package rpm deb check
