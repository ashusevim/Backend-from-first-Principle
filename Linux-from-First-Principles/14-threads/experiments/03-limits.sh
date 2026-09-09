#!/bin/bash
# 03 — Limits: threads-max/pids/stack-size tour + 64-thread spawn test.
# SAFE: read-only + one quick 64-thread create/join.
#
# Run:  bash 03-limits.sh
set -u
cd "$(dirname "$0")/../code" && make -s thrinfo

echo "=== 1. the ceilings ==="
echo "threads-max (system):  $(cat /proc/sys/kernel/threads-max)"
echo "RLIMIT_NPROC (user):   $(ulimit -u)"
if [ -f /sys/fs/cgroup/pids.max ]; then
    echo "cgroup pids.max:       $(cat /sys/fs/cgroup/pids.max)"
else
    echo "cgroup pids.max:       (controller not enabled here — §26 turns it on)"
fi
echo "default stack:         $(ulimit -s) KiB (x threads = VSZ — the practical ceiling)"

echo
echo "=== 2. spawn test: 64 threads, create+join, no sweat ==="
./thrinfo 64 0 | wc -l | xargs -I{} echo "lines printed: {} (main + 64 workers, all joined)"
