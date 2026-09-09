#!/bin/bash
# 01 — Loader tour: ldd/readelf -d/explicit ld.so/LD_DEBUG.
# SAFE: read-only.
#
# Run:  bash 01-loader-tour.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s lazy dlmod whofirst liba.so libb.so libwho.so libhook.so
CODEDIR=$PWD
LD=/lib64/ld-linux-x86-64.so.2

echo "=== 1. the loader's input: NEEDED + INTERP ==="
readelf -d /bin/true | grep -E 'NEEDED|INTERP' | sed 's/^/  /'
echo "--- our lazy binary's loader instructions ---"
readelf -d "$CODEDIR/lazy" | grep -E 'NEEDED|RUNPATH|RPATH' | sed 's/^/  /'

echo
echo "=== 2. run the loader BY HAND (same result!) ==="
$LD /bin/true; echo "ld.so /bin/true exit: $?"
$LD --list /bin/true | sed 's/^/  /'
echo "(--list IS ldd: ldd just sets LD_TRACE_LOADED_OBJECTS=1)"

echo
echo "=== 3. search order: LD_DEBUG=libs finds libc ==="
LD_DEBUG=libs /bin/true 2>&1 | grep -A3 'find library=libc' | grep -vE ':[ \t]*$' | sed 's/^/  /'

echo
echo "=== 4. relocation bill: LD_DEBUG=statistics ==="
LD_DEBUG=statistics /bin/true 2>&1 | grep -E 'relocations:|startup time' | sed 's/^/  /'
