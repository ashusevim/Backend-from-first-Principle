#!/usr/bin/env bash
# 03-see-preemption.sh — Voluntary vs involuntary switches, live counters.
# Run: ./03-see-preemption.sh   (from this directory; ~8s)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" ctxcount 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Alone: spin (burns CPU, rarely preempted — few of either)"
"$CODE/ctxcount" spin 2

say "2. Alone: sleep-loop (yields constantly — voluntary climbs)"
"$CODE/ctxcount" sleep 2

if command -v taskset >/dev/null; then
say "3. Contended: spin while a rival burns the same CPU (involuntary climbs)"
taskset -c 0 "$CODE/spinner" 30 >/dev/null 2>&1 &
RIVAL=$!
sleep 0.2
taskset -c 0 "$CODE/ctxcount" spin 2
kill "$RIVAL" 2>/dev/null
wait "$RIVAL" 2>/dev/null || true
else
echo "(install taskset for the contention demo)"
fi

say "4. The kernel's own ledger: this script's shell (pid $$)"
grep -E 'voluntary_ctxt_switches|nonvoluntary_ctxt_switches' /proc/$$/status
echo "(mostly voluntary — the shell sleeps waiting for children; note: we"
echo " must use \$$ here, since /proc/self would mean the grep itself!)"

say "Takeaway"
echo "Spinning alone: quiet counters. Sleeping: voluntary. Contended"
echo "spinning: involuntary — each one a preemption you can count."
