#!/usr/bin/env bash
# 02-nice-matters.sh — nice 0 vs nice 10 on one CPU: expect ~9:1 shares.
# Also: lowering nice / going RT as a mortal => EPERM (by design).
# Run: ./02-nice-matters.sh   (from this directory; ~8s)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" spinner sched_info 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

if ! command -v taskset >/dev/null; then
  echo "needs taskset (util-linux) — skipping pinned demo"
  exit 0
fi

say "1. The race: nice 0 (weight 1024) vs nice 10 (weight 110)"
echo "(both pinned to CPU 0, same 3s window; iters ~= CPU granted)"
taskset -c 0 "$CODE/spinner" 3 >/tmp/nice0.out 2>&1 &
taskset -c 0 nice -n 10 "$CODE/spinner" 3 >/tmp/nice10.out 2>&1 &
wait
cat /tmp/nice0.out /tmp/nice10.out
awk 'NR==1{i0=$5} NR==2{i10=$5} END{printf "iters ratio (nice0/nice10) = %.1f  (theory: 1024/110 = 9.3)\n", i0/i10}' /tmp/nice0.out /tmp/nice10.out

say "2. Who you are to the scheduler (+ the RT refusal)"
taskset -c 0 "$CODE/sched_info"

say "3. Unprivileged RT via chrt: the same wall, from the toolbox"
if command -v chrt >/dev/null; then
  chrt -f 50 "$CODE/spinner" 0.1 2>&1 | head -2 || true
else
  echo "(chrt not installed — sched_info above already demoed the EPERM)"
fi
echo "---"
echo "And lowering nice (higher prio) as non-root:"
nice -n -5 "$CODE/spinner" 0.1 2>&1 | head -2 || true

say "Takeaway"
echo "Weights decide shares (1024 vs 110 ≈ 9:1); classes decide everything"
echo "else. And privilege gates both — fairness is enforced, not requested."
rm -f /tmp/nice0.out /tmp/nice10.out
