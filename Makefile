DIST=dist
COCKPIT_DIR=$(HOME)/.local/share/cockpit
COCKPIT_TARGET=$(COCKPIT_DIR)/slurmcostmanager

all: build

build:
	mkdir -p $(DIST)
	cp -r src/* $(DIST)/
	cp manifest.json $(DIST)/


clean:
	rm -rf $(DIST)

devel-install: build
	mkdir -p $(COCKPIT_DIR)
	ln -sfn $(abspath $(DIST)) $(COCKPIT_TARGET)

devel-uninstall:
	@if [ -L $(COCKPIT_TARGET) ]; then \
	rm $(COCKPIT_TARGET); \
	else \
		echo "No symlink to remove at $(COCKPIT_TARGET)"; \
	fi

watch:
	@command -v inotifywait >/dev/null || { echo "inotifywait not found"; exit 1; }
	@echo "Watching src/ for changes..."
		@while inotifywait -e modify,create,delete -r src/; do \
			make devel-install; \
	done

check:
	./test/check-application

.PHONY: all build clean devel-install devel-uninstall watch check
