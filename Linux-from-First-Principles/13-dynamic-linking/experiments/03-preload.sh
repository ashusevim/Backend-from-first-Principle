#!/bin/bash
# 03 — LD_PRELOAD: a puts-hook shadows libc — hooked vs clean.
# SAFE: same binary, one env var, fully reversible (unset = clean).
#
# Run:  bash 03-preload.sh
set -u
cd "$(dirname "$0")/../code" && make -s whofirst libwho.so libhook.so

echo "=== 1. clean run (no preload) ==="
./whofirst

echo
echo "=== 2. hooked run (LD_PRELOAD=./libhook.so) ==="
LD_PRELOAD=./libhook.so ./whofirst

echo
echo "=== 3. the winner, on record: LD_DEBUG=symbols ==="
LD_PRELOAD=./libhook.so LD_DEBUG=symbols ./whofirst 2>&1 | grep -E 'symbol=puts' | head -3 | sed "s|$PWD|.|g"
echo "(first hit wins: libhook.so's puts shadows libc's for this run only)"
echo "note: setuid programs IGNORE LD_PRELOAD (AT_SECURE — §12.3 step 2)"
