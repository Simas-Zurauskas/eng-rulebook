#!/usr/bin/env bash
# check-tables.sh — the four-table consistency gate.
#
# Adding a standard means editing four tables in one commit:
#   1. SKILL.md            § Routing table        (authoritative on routing)
#   2. references/_authoring.md § Library index   (authoritative on lane ownership)
#   3. references/README.md    § The standards    (scope index)
#   4. README.md               § Topics           (human summary)
#
# The filesystem arbitrates: a standard present in references/ and missing from a table means
# the TABLE is wrong. Add the row — never delete a route to make the tables agree.
#
# Exit 0 = all four tables list exactly the standards on disk. Exit 1 = drift, itemised.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 2

fail=0

# --- the authority: what is actually on disk -------------------------------------------------
# A standard is references/*.md excluding the index (README.md) and any _-prefixed file,
# which is library machinery (the authoring contract, the gaps backlog) rather than a rulebook.
disk=$(find references -maxdepth 1 -name '*.md' ! -name 'README.md' ! -name '_*.md' \
       -exec basename {} \; | sort)

# --- extract a markdown section by heading, up to the next same-or-higher heading -------------
section() { # $1=file $2=heading-regex
  awk -v pat="$2" '
    $0 ~ "^#{1,3} " pat { inside=1; next }
    inside && /^#{1,3} / { exit }
    inside { print }
  ' "$1"
}

compare() { # $1=label $2=newline-separated basenames found in the table
  local label="$1" found
  found=$(printf '%s\n' "$2" | grep -v '^$' | sort -u)
  local missing extra
  missing=$(comm -23 <(printf '%s\n' "$disk") <(printf '%s\n' "$found"))
  extra=$(comm -13 <(printf '%s\n' "$disk") <(printf '%s\n' "$found"))
  if [ -n "$missing" ] || [ -n "$extra" ]; then
    fail=1
    echo "DRIFT vs disk in: $label"
    [ -n "$missing" ] && printf '  < %s   (on disk, missing from this table — ADD the row)\n' $missing
    [ -n "$extra" ]   && printf '  > %s   (in this table, not on disk — stale row)\n' $extra
  fi
}

# 1. SKILL.md § Routing table — cites `references/<file>.md`; _authoring.md is a legitimate
#    non-standard row (the authoring contract), so it is filtered out of the comparison set.
compare "SKILL.md § Routing table" \
  "$(section SKILL.md 'Routing table' | grep -oE 'references/[a-z0-9-]+\.md' \
     | sed 's|references/||' | grep -v '^_authoring\.md$')"

# 2. references/_authoring.md § Library index — first column is `<file>.md`
compare "references/_authoring.md § Library index" \
  "$(section references/_authoring.md 'Library index' | grep -oE '`[a-z0-9-]+\.md`' | tr -d '`')"

# 3. references/README.md § The standards — links as [`<file>.md`](<file>.md)
compare "references/README.md § The standards" \
  "$(section references/README.md 'The standards' | grep -oE '\]\([a-z0-9-]+\.md\)' \
     | sed -E 's/\]\(|\)//g')"

# 4. README.md § Topics — links as [`<topic>`](references/<topic>.md)
compare "README.md § Topics" \
  "$(section README.md 'Topics' | grep -oE 'references/[a-z0-9-]+\.md' | sed 's|references/||')"

if [ "$fail" -eq 0 ]; then
  echo "OK — all four tables list the $(printf '%s\n' "$disk" | grep -c .) standards on disk."
fi
exit "$fail"
