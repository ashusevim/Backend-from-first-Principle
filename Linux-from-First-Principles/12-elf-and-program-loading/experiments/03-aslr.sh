#!/bin/bash
# 03 — ASLR: addrs x5 (dance) vs setarch -R (frozen).
# SAFE: read-only.
#
# Run:  bash 03-aslr.sh
set -u
cd "$(dirname "$0")/../code" && make -s addrs
CODEDIR=$PWD

echo "=== 1. five runs: every region dances ==="
for i in 1 2 3 4 5; do
    "$CODEDIR/addrs" | tr '\n' ' ' | sed "s/^/run$i: /"; echo
done

echo
echo "=== 2. the slide, measured (actual main minus file main) ==="
FILEMAIN=$(readelf -sW "$CODEDIR/addrs" 2>/dev/null | awk '$8=="main" {print "0x"$2; exit}')
ACTUAL=$("$CODEDIR/addrs" | awk '/code/{print $2}')
if [ -n "$FILEMAIN" ]; then
    printf 'file main:   %s\nactual main: %s\nPIE slide:   +0x%x\n' "$FILEMAIN" "$ACTUAL" $((ACTUAL - FILEMAIN))
else
    echo "(stripped binary? can't read file vaddr — the dance above still proves ASLR)"
fi

echo
echo "=== 3. frozen: setarch -R pins the slide ==="
if command -v setarch > /dev/null; then
    setarch -R "$CODEDIR/addrs" | tr '\n' ' ' | sed 's/^/froze1: /'; echo
    setarch -R "$CODEDIR/addrs" | tr '\n' ' ' | sed 's/^/froze2: /'; echo
    echo "(identical — exe always 0x555555554000. Never trust an address across runs.)"
else
    echo "(no setarch here — the dance above IS the proof)"
fi
echo "knob: /proc/sys/kernel/randomize_va_space = $(cat /proc/sys/kernel/randomize_va_space) (2 = full)"
