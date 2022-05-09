#!make
#
# This Makefile is only for building release artifacts. Use `npm run` for CLIv1 scripts.
#
# Documentation: https://www.gnu.org/software/make/manual/make.html
#
# <target...>: <prerequisite...> | <order-only-prerequisite...>
# targets are rebuilt if their modification time is older than their prerequisite's.
# prerequisites are built automatically if they don't exist.
# order-only-prerequisites are never rebuilt.
#
# $@    = target
# $(@D) = target's parent directory
# $(@F) = target's file name
# $<    = first prerequisite
# $(<D) = first prerequisite's parent directory
# $(<F) = first prerequisite's file name
# %     = pattern match e.g. given %.sha256, provided file.sha256, % is 'file'.

MIN_MAKE_VERSION := 4.2.1
ifneq ($(MIN_MAKE_VERSION),$(firstword $(sort $(MAKE_VERSION) $(MIN_MAKE_VERSION))))
$(error 'GNU Make $(MIN_MAKE_VERSION) or above required.')
endif

NPM := npm
NPX := npx
PKG := $(NPX) pkg ./

WEBPACK_BUNDLE := dist/cli/index.js
BINARY_DIR := binary-releases

ifeq ($(CIRCLE_BRANCH), master)
# compression is slow so only do it on master
PKG += --compress Brotli
endif

# First target is default when running `make`.
.PHONY: help
help:
	@echo 'Usage: make <target>'
	@echo
	@echo 'This Makefile is currently only for building release artifacts.'
	@echo 'Use `npm run` for CLIv1 scripts.'

$(WEBPACK_BUNDLE):
	$(NPM) run build:prod

$(BINARY_DIR):
	mkdir $@

$(BINARY_DIR)/version: | $(BINARY_DIR)
	./release-scripts/next-version.sh > $@

$(BINARY_DIR)/RELEASE_NOTES.md: | $(BINARY_DIR)
	npx conventional-changelog-cli -p angular -l -r 1 --commit-path ':(exclude)cliv2' > $@

# this target is destructive since package.json files are modified in-place.
.prepare: $(WEBPACK_BUNDLE) $(BINARY_DIR)/version
	@echo "'make .prepare' was run. Run 'make clean-prepare' to rollback your package.json changes and this file." > $@
	$(NPM) version "$(shell cat $(BINARY_DIR)/version)" --no-git-tag-version --workspaces --include-workspace-root
	$(NPX) ts-node ./release-scripts/prune-dependencies-in-packagejson.ts

.PHONY: clean-prepare
clean-prepare:
	git checkout package.json package-lock.json packages/*/package.json packages/*/package-lock.json
	rm -f .prepare

$(BINARY_DIR)/snyk-alpine: .prepare
	$(PKG) -t node16-alpine-x64 -o $@
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-linux: .prepare
	$(PKG) -t node16-linux-x64 -o $@
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-linux-arm64: .prepare
	$(PKG) -t node16-linux-arm64 -o $@ --no-bytecode
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-macos: .prepare
	$(PKG) -t node16-macos-x64 -o $@
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-win.exe.unsigned: .prepare
	$(PKG) -t node16-win-x64 -o $@

$(BINARY_DIR)/snyk-win.exe: $(BINARY_DIR)/snyk-win.exe.unsigned cert.pem key.pem
	osslsigncode sign -h sha512 \
		-certs cert.pem \
		-key key.pem \
		-n "Snyk CLI" \
		-i "https://snyk.io" \
		-t "http://timestamp.comodoca.com/authenticode" \
		-in $< \
		-out $@
	rm $<
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-for-docker-desktop-darwin-x64.tar.gz: .prepare
	./docker-desktop/build.sh darwin x64
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-for-docker-desktop-darwin-arm64.tar.gz: .prepare
	./docker-desktop/build.sh darwin arm64
	$(MAKE) $@.sha256

$(BINARY_DIR)/docker-mac-signed-bundle.tar.gz: .prepare
	./release-scripts/docker-desktop-release.sh
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk.tgz: .prepare
	mv $(shell $(NPM) pack) $@
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-fix.tgz: .prepare
	mv $(shell $(NPM) pack --workspace '@snyk/fix') $@
	$(MAKE) $@.sha256

$(BINARY_DIR)/snyk-protect.tgz: .prepare
	mv $(shell $(NPM) pack --workspace '@snyk/protect') $@
	$(MAKE) $@.sha256

%.sha256: %
	cd $(@D); shasum -a 256 $(<F) > $(@F); shasum -a 256 -c $(@F)

cert.pem:
	@echo "$(SIGNING_CERT)" | base64 --decode > $@

key.pem:
	@echo "$(SIGNING_KEY)" | base64 --decode > $@

$(BINARY_DIR)/sha256sums.txt: $(BINARY_DIR)/*.sha256
	cat $< > $@
	cat $@

$(BINARY_DIR)/sha256sums.txt.asc: $(BINARY_DIR)/sha256sums.txt
	@echo "$(SNYK_CODE_SIGNING_PGP_PRIVATE)" | base64 --decode | gpg --import --batch --passphrase "$(SNYK_CODE_SIGNING_GPG_PASSPHRASE)"
	@gpg --clear-sign --local-user=1F4B9569 --passphrase="$(SNYK_CODE_SIGNING_GPG_PASSPHRASE)" --pinentry-mode=loopback --armor --batch $<
	cat $@

$(BINARY_DIR)/release.json: $(BINARY_DIR)/version
	./release-scripts/release-json.sh $@
