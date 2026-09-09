#!/bin/bash
# 01 — Identity: thrinfo + task census + unlabeled-8M thread stacks.
# SAFE: spawns 4 short-lived threads (6s hold), all joined.
#
# Run:  bash 01-identity.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s thrinfo
S10="$EXPDIR/../../10-virtual-memory/code"
(cd "$S10" && make -s maps)   # S10's tool reads our stacks (gitignored there)

echo "=== 1. one pid, five tids ==="
stdbuf -o0 ./thrinfo 4 6 &
PID=$!
sleep 0.5
echo "--- /proc/$PID/task (the kernel's thread list) ---"
ls /proc/$PID/task | tr '\n' ' '; echo "(main + 4 workers)"
echo "--- ps -T (same tids, second witness) ---"
ps -T -p $PID -o pid,spid,cmd 2>/dev/null | head -7 || echo "(no ps -T here)"

echo
echo "=== 2. thread stacks: UNLABELED 8.0M anon (no [stack:TID] on 6.1!) ==="
echo "--- labeled: main [stack] only ---"
grep '\[stack\]' /proc/$PID/maps | sed 's/^/  /'
echo "--- unlabeled: four 8.0M anon-mmap lines (one per thread) ---"
"$S10/maps" $PID | grep '8\.0M.*anon-mmap' | sed 's/^/  /'
N=$("$S10/maps" $PID | grep -c '8\.0M.*anon-mmap')
echo "(count=$N — match these ranges against thrinfo's stack= addrs above)"

echo
echo "=== 3. per-thread state (each sleeps in the hold) ==="
grep -H '^State' /proc/$PID/task/*/status | sed "s|/proc/$PID/task/||; s|/status:| |" | head -6
wait $PID
echo "(all joined — task dir gone: $(ls /proc/$PID/task 2>&1 | head -1))"
