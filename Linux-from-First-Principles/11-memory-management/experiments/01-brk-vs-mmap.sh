#!/bin/bash
# 01 — brk vs mmap: find MMAP_THRESHOLD empirically; move it; trace it.
# SAFE: transient ~8MB allocs, all freed. Read-only elsewhere.
#
# Run:  bash 01-brk-vs-mmap.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s brkvsmap
CODEDIR=$PWD
S03="$EXPDIR/../../03-system-calls/code"

echo "=== 1. the boundary, discovered (watch 130048 vs 131072 vs 262144) ==="
"$CODEDIR/brkvsmap"

echo
echo "=== 2. the boundary MOVES (env override, same binary) ==="
echo "--- MALLOC_MMAP_THRESHOLD_=1048576 (1M) ---"
MALLOC_MMAP_THRESHOLD_=1048576 "$CODEDIR/brkvsmap" | sed -n '1p;6,9p;$p'
echo "--- MALLOC_MMAP_THRESHOLD_=0 (everything mmaps) ---"
MALLOC_MMAP_THRESHOLD_=0 "$CODEDIR/brkvsmap" | sed -n '1,3p'

echo
echo "=== 3. the syscalls underneath (the track's own tracer) ==="
PREBUILT=0; [ -x "$S03/mini_strace" ] && PREBUILT=1
if (cd "$S03" && make -s mini_strace 2>/dev/null) && [ -x "$S03/mini_strace" ]; then
    "$S03/mini_strace" "$CODEDIR/brkvsmap" > /tmp/bm.trace 2>&1
    echo "brk calls:    $(grep -c 'brk(' /tmp/bm.trace) (heap growth)"
    echo "mmap calls:   $(grep -c 'mmap(' /tmp/bm.trace) (large-chunk path + startup)"
    echo "munmap calls: $(grep -c 'munmap(' /tmp/bm.trace) (large-chunk frees return RAM instantly)"
    [ $PREBUILT -eq 0 ] && rm -f "$S03/mini_strace"
    rm -f /tmp/bm.trace
else
    echo "(no tracer available — §03's mini_strace didn't build here)"
fi
