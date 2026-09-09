#!/bin/bash
# 02 — Race: less than 4M, differently every time (+ TLS contrast).
# SAFE: CPU-bound for ~1s, no I/O.
#
# Run:  bash 02-race.sh
set -u
cd "$(dirname "$0")/../code" && make -s race tls

echo "=== 1. the disease: 4M expected, three different wrong answers ==="
for i in 1 2 3; do ./race 4 1000000; done

echo
echo "=== 2. the contrast: shared loses, TLS sums exact ==="
./tls 4 1000000
echo "(cure in §15: mutexes + atomics. This section proves the disease.)"
