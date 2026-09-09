#!/bin/bash
# 01 — Read your maps: maps/smaps/statm of a live process; VSZ vs RSS vs PSS.
# SAFE: read-only (spawns a short-lived sleep as the specimen).
#
# Run:  bash 01-read-your-maps.sh
set -u
cd "$(dirname "$0")/../code" && make -s maps
CODEDIR=$PWD

echo "=== 1. your own floor plan (maps of THIS shell's child: maps itself) ==="
"$CODEDIR/maps" self | head -8
echo "--- landmarks (one line per region class) ---"
"$CODEDIR/maps" self | awk 'NR>1 && $1 != "---" && $1 != "VMAs:" && !seen[$4]++'

echo
echo "=== 2. a live specimen: sleep's map from the outside ==="
sleep 300 &
PID=$!
"$CODEDIR/maps" $PID | tail -6
echo "--- perms census of sleep (what fraction is executable?) ---"
awk '{p=substr($2,1,3); c[p]++} END {for (k in c) printf "  %s: %d VMAs\n", k, c[k]}' /proc/$PID/maps

echo
echo "=== 3. VSZ vs RSS vs PSS (three rulers, one process) ==="
SZ=$(awk '{print $1*4}' /proc/$PID/statm); RS=$(awk '{print $2*4}' /proc/$PID/statm)
PS=$(awk '/^Pss:/ {print $2}' /proc/$PID/smaps_rollup)
echo "sleep: VSZ=${SZ}K  RSS=${RS}K  PSS=${PS}K  (PSS < RSS: libc is shared)"
kill $PID 2>/dev/null

echo
echo "=== 4. status: the greatest hits (VmPTE = page-table cost!) ==="
sleep 60 &
PID=$!
grep -E '^Vm(Peak|Size|HWM|RSS|Data|Stk|Exe|Lib|PTE|Swap)' /proc/$PID/status | sed 's/^/  /'
kill $PID 2>/dev/null

echo
echo "=== 5. cross-check: pmap reads the same kernel files ==="
if command -v pmap > /dev/null; then
    sleep 60 &
    PID=$!
    pmap -x $PID | tail -2 | sed 's/^/  /'
    kill $PID 2>/dev/null
else
    echo "(no pmap here — maps.c above IS the cross-check)"
fi
