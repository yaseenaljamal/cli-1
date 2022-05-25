#!/usr/bin/env bash

EXTENSIONS_PATH="cliv2/extensions/extensions.json"

EXTENSIONS=$(jq -r '.extensions' "${EXTENSIONS_PATH}")

for EXTENSION in ${EXTENSIONS}; do
    gh repo clone "${EXTENSION}" .
    cd "${EXTENSION}" || return
    make build
done
