#!/usr/bin/env bash
# 02-pending-lab.sh — Blocked signals pile in SigPnd (merged!), then deliver.
# Run: ./02-pending-lab.sh   (from this directory; ~10s)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" sigblock 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Start sigblock (8s window), hammer it mid-window"
"$CODE/sigblock" 8 &
S=$!
sleep 3
echo "--- sending INT, INT, TERM while blocked (watch: process keeps sleeping) ---"
kill -INT "$S"; kill -INT "$S"; kill -TERM "$S"
sleep 1
echo "--- pending queues right now (from OUTSIDE, via /proc/$S/status) ---"
grep -E '^(SigPnd|ShdPnd|SigBlk)' /proc/$S/status
echo "(decode: bit n-1 = signal n. INT=2 -> ..02, TERM=15 -> ..4000.)"
echo "(kill() is process-directed, so they wait in ShdPnd (shared), not SigPnd.)"
wait "$S"

say "Takeaway"
echo "Two INTs merged into one pending bit (standard signals don't queue);"
echo "both handlers fired exactly once, the moment the mask lifted."
