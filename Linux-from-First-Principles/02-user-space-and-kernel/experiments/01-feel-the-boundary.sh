#!/usr/bin/env bash
# 01-feel-the-boundary.sh — Poke the ring-0 wall from three directions.
# Run: ./01-feel-the-boundary.sh   (run from this directory; builds ../code first)
set -u
set -o pipefail # a denied read inside a pipeline must still count as failure
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building the section's programs"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"
"$CODE/privilege_denied"

say "1. Another process's memory is not yours (PID 1)"
if head -c 16 /proc/1/mem 2>/tmp/boundary_err | od -An -tx1 | head -1; then
  echo "(readable?! you are root or unusually privileged)"
else
  echo "refused: $(cat /tmp/boundary_err)"
  echo "-> kernel's mm_access() check: only self/root/with-CAP_SYS_PTRACE."
fi

say "2. The kernel log is (often) not yours either"
if dmesg 2>/tmp/boundary_err | head -2; then
  echo "(readable on this machine: kernel.dmesg_restrict=0)"
else
  echo "refused: $(cat /tmp/boundary_err)"
  echo "-> kernel hides its log from unprivileged users (info-leak guard)."
fi
cat /sys/devices/system/cpu/vulnerabilities/meltdown 2>/dev/null || true
rm -f /tmp/boundary_err

say "3. The gate has a price (nanoseconds per crossing)"
"$CODE/crossing_cost" 1000000
