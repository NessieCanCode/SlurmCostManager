DIST=dist

all: build

build:
	mkdir -p $(DIST)
	cp -r src/* $(DIST)/
	cp manifest.json $(DIST)/

clean:
	rm -rf $(DIST)

.PHONY: all build clean
