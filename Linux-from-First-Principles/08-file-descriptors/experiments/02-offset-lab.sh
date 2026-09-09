#!/usr/bin/env bash
# 02-offset-lab.sh — fdchain + forkshare: the sharing matrix, proven.
# Run: ./02-offset-lab.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" fdchain forkshare 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. fdchain: open+open+dup — who shares offsets with whom"
"$CODE/fdchain"

say "2. forkshare (3 runs: order varies, byte counts never do)"
for i in 1 2 3; do "$CODE/forkshare" || echo "RUN $i FAILED (report!)"; done

say "Takeaway"
echo "dup/fork => shared offset (one position). open/open => independent."
echo "Scheduling shuffles the ORDER; the kernel guarantees the BYTES."
