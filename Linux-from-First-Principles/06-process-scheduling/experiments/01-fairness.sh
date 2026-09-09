#!/usr/bin/env bash
# 01-fairness.sh — Two equal spinners, one CPU: CFS splits it ~50/50.
# Run: ./01-fairness.sh   (from this directory; ~10s)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

if ! command -v taskset >/dev/null; then
  echo "taskset not found — install util-linux for the pinned version."
  echo "Fallback: N+1 spinners on N CPUs (sharing forced by oversubscription)."
  N=$(nproc)
  for i in $(seq 1 $((N + 1))); do ( time "$CODE/spinner" 2 ) 2>&1 | grep -E 'real|user' & done
  wait
  exit 0
fi

say "1. Baseline: one spinner owns CPU 0 for 3s (all iters are its own)"
taskset -c 0 "$CODE/spinner" 3 | tee /tmp/solo.out
SOLO=$(awk '{print $5}' /tmp/solo.out)

say "2. Two spinners, same CPU, same nice: iters should halve EACH"
taskset -c 0 "$CODE/spinner" 3 >/tmp/duo1.out 2>&1 &
taskset -c 0 "$CODE/spinner" 3 >/tmp/duo2.out 2>&1 &
wait
cat /tmp/duo1.out /tmp/duo2.out
awk -v solo="$SOLO" 'NR==1{d1=$5} NR==2{d2=$5} END{
  # NOTE: compute ratio in a variable FIRST — a bare ">" inside printf's
  # argument list means REDIRECT in awk (it once wrote this very line to a
  # file literally named "1.00478" instead of printing it). Classic footgun.
  ratio = d1>d2 ? d1/d2 : d2/d1;
  printf "solo=%d, duo=(%d, %d)\n", solo, d1, d2;
  printf "each duo share = %.0f%% of solo (expect ~50%%), duo ratio = %.2f (expect ~1.00)\n",
    ((d1+d2)/2)/solo*100, ratio}' /tmp/duo1.out /tmp/duo2.out

say "Takeaway"
echo "Equal weights + one CPU = equal shares. CFS doesn't do turns — both"
echo "accumulate vruntime at the same rate, so the 'smallest' alternates."
rm -f /tmp/solo.out /tmp/duo1.out /tmp/duo2.out
