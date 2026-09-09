#!/bin/bash
# 02 — Lazy binding: bindings appear between prints; BIND_NOW flips it.
# SAFE: read-only.
#
# Run:  bash 02-lazy-binding.sh
set -u
cd "$(dirname "$0")/../code" && make -s lazy liba.so libb.so

echo "=== 1. baseline: markers + calls in order ==="
./lazy

echo
echo "=== 2. LAZY: each binding lands at its FIRST call ==="
LD_DEBUG=bindings ./lazy 2>&1 | grep -E 'lazy:|symbol .[ab].' | sed 's/^ *[0-9][0-9]*: *//; s/ \[0\]//g' | sed "s|$PWD|.|g"

echo
echo "=== 3. NOW: LD_BIND_NOW=1 resolves everything upfront ==="
LD_BIND_NOW=1 LD_DEBUG=bindings ./lazy 2>&1 | grep -E 'lazy:|symbol .[ab].' | sed 's/^ *[0-9][0-9]*: *//; s/ \[0\]//g' | sed "s|$PWD|.|g"
echo "(both bindings precede the first print — slower start, frozen GOT after)"

echo
echo "=== 4. the bill: relocation counts, lazy vs now ==="
echo -n "lazy: "; LD_DEBUG=statistics ./lazy 2>&1 | grep 'number of relocations:' | head -1 | awk '{print $NF}'
echo -n "now:  "; LD_DEBUG=statistics LD_BIND_NOW=1 ./lazy 2>&1 | grep 'number of relocations:' | head -1 | awk '{print $NF}'
