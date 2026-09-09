#!/bin/bash
# 03 — Arenas: threads x reservations; ARENA_MAX tames the VSZ sprawl.
# SAFE: transient thread holds (~512K) + virtual reservations (uncommitted).
#
# Run:  bash 03-arenas.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s arenas
CODEDIR=$PWD

echo "=== 0. the machine (arena cap = 8 x ncpu) ==="
echo "ncpu=$(nproc) => max arenas=$(( 8 * $(nproc) ))"

echo
echo "=== 1. two threads: two 64M reservations ==="
"$CODEDIR/arenas" 2

echo
echo "=== 2. eight threads: eight reservations, ~511M of VIRTUAL ==="
"$CODEDIR/arenas" 8

echo
echo "=== 3. the cap: ARENA_MAX=2 (same program, one reservation) ==="
MALLOC_ARENA_MAX=2 "$CODEDIR/arenas" 8

echo
echo "=== 4. the floor: ARENA_MAX=1 (main arena only?) ==="
MALLOC_ARENA_MAX=1 "$CODEDIR/arenas" 8
echo "(tradeoff, out loud: fewer arenas = less VSZ slack, more lock contention)"
