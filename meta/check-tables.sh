#!/usr/bin/env bash
# Compatibility entrypoint: the library now has one authoritative index.
exec node "$(dirname "$0")/check.mjs"
