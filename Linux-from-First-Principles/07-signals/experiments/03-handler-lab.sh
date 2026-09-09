#!/usr/bin/env bash
# 03-handler-lab.sh — USR1/INT/TERM against sigdemo (flag pattern) + fault.
# Run: ./03-handler-lab.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" sigdemo fault 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. sigdemo: handlers set flags, main prints (async-safe)"
"$CODE/sigdemo" &
S=$!
sleep 0.3
kill -USR1 "$S"
sleep 0.3
kill -USR1 "$S"
sleep 0.3
kill -INT "$S"
sleep 0.3
kill -TERM "$S"
wait "$S"
echo "(sigdemo exited $?: TERM => graceful shutdown)"

say "2. fault: catching your own SEGV (handler must _exit, never return)"
"$CODE/fault"
echo "(fault exited $?: 139 = 128+SIGSEGV, the shell convention)"

say "3. Uncaught SEGV for comparison (default disposition: Core)"
echo "(the 'Segmentation fault' line below is bash reporting the crash — that IS the demo)"
bash -c 'kill -SEGV $$'
echo "(bash killed itself with SEGV: exit $?)"

say "Takeaway"
echo "Handled signals run YOUR code (flag pattern keeps it safe); unhandled"
echo "ones run the DEFAULT (Term/Core/...). Same mechanism, both directions."
