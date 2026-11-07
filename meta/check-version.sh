#!/usr/bin/env bash
# Compatibility entrypoint: VERSION and current references are checked together.
exec node "$(dirname "$0")/check.mjs"
