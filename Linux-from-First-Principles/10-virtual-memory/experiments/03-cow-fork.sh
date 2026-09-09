#!/bin/bash
# 03 — CoW fork: fork 100MB without copying; Shr/Priv/PSS diverge on write.
# SAFE: transient ~100MB RAM (x2 during child write), freed on exit.
#
# Run:  bash 03-cow-fork.sh
set -u
cd "$(dirname "$0")/../code" && make -s cow
CODEDIR=$PWD

echo "=== 1. the proof run: 50MB across fork+write ==="
"$CODEDIR/cow" 50
echo "(read it: RSS flat throughout; Shr 1M->51M->1M; Priv 51M->44K->51M; Pss halved, restored)"

echo
echo "=== 2. fork is cheap because bytes don't move (timed) ==="
time "$CODEDIR/cow" 100 > /dev/null
echo "(~100MB 'copied' in milliseconds — only page tables were duplicated)"

echo
echo "=== 3. the OOM + swap picture (read-only) ==="
echo "  this shell: oom_score=$(cat /proc/$$/oom_score 2>/dev/null) adj=$(cat /proc/$$/oom_score_adj 2>/dev/null)"
echo -n "  swaps: "; tail -n +2 /proc/swaps | wc -l | xargs -I{} echo "{} active (empty here: anon pages UNEVICTABLE)"
echo "  swappiness=$(cat /proc/sys/vm/swappiness 2>/dev/null) (0-200: anon-vs-file reclaim bias)"
grep -E '^VmSwap' /proc/$$/status | sed 's/^/  self /'
