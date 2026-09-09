#!/usr/bin/env bash
# 03-inspect-yourself.sh — Build this section's code; cross-check vs ps.
# Run: ./03-inspect-yourself.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. procself: your task_struct, field by field"
"$CODE/procself"

say "2. ppid_chain: your lineage up to init"
"$CODE/ppid_chain"

say "3. Cross-check: ps agrees (it parses the same files)"
ps -o pid,ppid,pgid,sid,stat,cmd -p $$ | tail -1
echo "(this script's pid (col 1) was procself's ppid; pgid/sid match procself's Part 1)"
