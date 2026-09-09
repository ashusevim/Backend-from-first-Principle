#!/bin/bash
# 02 — Demand paging: 256MB untouched (RSS≈0) vs touched; mincore + faults.
# SAFE: transient ~256MB RAM use, freed on exit. No disk writes.
#
# Run:  bash 02-demand-paging.sh
set -u
cd "$(dirname "$0")/../code" && make -s faults
CODEDIR=$PWD

echo "=== 1. the headline run: mmap 256MB, touch nothing, touch all ==="
"$CODEDIR/faults" 256

echo
echo "=== 2. fault counters from the OUTSIDE (/proc/PID/stat fields 10+12) ==="
sleep 60 &
PID=$!
echo "sleep $PID: minflt=$(awk '{print $10}' /proc/$PID/stat) majflt=$(awk '{print $12}' /proc/$PID/stat)"
echo "(same kernel counters getrusage() reads — faults.c just prints them)"
kill $PID 2>/dev/null
echo -n "this shell: minflt="; awk '{print $10}' /proc/$$/stat

echo
echo "=== 3. huge pages: the other page size (observe only) ==="
echo -n "  THP mode: "; cat /sys/kernel/mm/transparent_hugepage/enabled 2>/dev/null || echo "(no THP knob)"
grep -E 'HugePages_Total|Hugepagesize|AnonHugePages' /proc/meminfo | sed 's/^/  /'
echo "(AnonHugePages > 0 = something already runs on 2MB pages)"
