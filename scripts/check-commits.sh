#!/bin/sh
# Runs the commit-msg hook over every commit in a revision range (default: all of HEAD).
# Usage: check-commits.sh [<range>]

range=${1:-HEAD}
root=$(git rev-parse --show-toplevel) || exit 1
tmp=$(mktemp) || exit 1
trap 'rm -f "$tmp"' EXIT

status=0
for commit in $(git rev-list "$range"); do
  git log -1 --format=%B "$commit" > "$tmp"
  if ! sh "$root/.githooks/commit-msg" "$tmp"; then
    echo "  in commit $commit" >&2
    status=1
  fi
done

exit $status
