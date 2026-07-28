#!/usr/bin/env bash
# check-version.sh — the release gate.
#
# 1. VERSION is a bare positive integer.
# 2. Every standard carries a `**Rev:** N (date)` header.
# 3. Every rulebook changed since the last release is named in the newest CHANGELOG entry's
#    `Touches:` list. Enforced against the merge-base when one exists, else against HEAD~1;
#    on a repo with a single commit there is nothing to diff and the check reports that
#    honestly rather than passing vacuously.
# 4. The shape and table gates pass.
#
# Usage: meta/check-version.sh [<base-ref>]

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 2
fail=0
say() { printf '%s\n' "$*"; }

# --- 1. VERSION ------------------------------------------------------------------------------
if [ ! -f VERSION ]; then say "FAIL: no VERSION file"; fail=1
else
  v=$(tr -d '[:space:]' < VERSION)
  if ! printf '%s' "$v" | grep -qE '^[1-9][0-9]*$'; then
    say "FAIL: VERSION must be a bare positive integer, got '$v'"; fail=1
  else say "VERSION = $v"; fi
fi

# --- 2. per-rulebook Rev: --------------------------------------------------------------------
missing=0
for f in references/*.md; do
  b=$(basename "$f")
  case "$b" in README.md|_*) continue;; esac   # index + _-prefixed machinery are not standards
  grep -qE '\*\*Rev:\*\* [0-9]+ \([0-9]{4}-[0-9]{2}-[0-9]{2}\)' "$f" || { say "FAIL: $b has no '**Rev:** N (date)' header"; missing=1; }
done
[ "$missing" -eq 0 ] && say "Rev: header present on every standard" || fail=1

# --- 3. changed rulebooks are named in the newest CHANGELOG entry -----------------------------
base="${1:-}"
if [ -z "$base" ]; then
  if git rev-parse --verify -q HEAD~1 >/dev/null 2>&1; then base="HEAD~1"; fi
fi
if [ -z "$base" ]; then
  say "SKIP: single-commit repo — no base to diff against (not a pass, just nothing to compare)"
else
  changed=$(git diff --name-only "$base" -- references/ 2>/dev/null | xargs -n1 basename 2>/dev/null \
            | grep -vE '^(README|_authoring)\.md$' | sort -u)
  if [ -n "$changed" ]; then
    entry=$(awk '/^## v[0-9]+/{n++} n==1' CHANGELOG.md)
    for c in $changed; do
      printf '%s' "$entry" | grep -q -- "$c" || { say "FAIL: $c changed since $base but is not named in the newest CHANGELOG entry"; fail=1; }
    done
    [ "$fail" -eq 0 ] && say "CHANGELOG names every rulebook changed since $base"
  else
    say "no rulebook changed since $base"
  fi
fi

# --- 4. the other gates ----------------------------------------------------------------------
node meta/check-rulebook-shape.mjs >/dev/null 2>&1 || { say "FAIL: check-rulebook-shape.mjs"; fail=1; }
./meta/check-tables.sh >/dev/null 2>&1 || { say "FAIL: check-tables.sh"; fail=1; }
[ "$fail" -eq 0 ] && say "shape + table gates pass"

exit "$fail"
