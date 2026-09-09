#!/usr/bin/env bash
# 01-fork-wait-lab.sh — fork_demo: one call, two returns, one reaping.
# Run: ./01-fork-wait-lab.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Run it (parent/child lines may interleave — scheduling!)"
"$CODE/fork_demo"

say "2. Same thing, traced: find the clone with no exec after it"
TRACER="../../03-system-calls/code/mini-strace"
if [ ! -x "$TRACER" ]; then
  echo "(building Section 03's mini-strace first...)"
  make -C ../../03-system-calls/code mini-strace 2>&1 | grep -E 'warning|error' || true
fi
if [ -x "$TRACER" ]; then
  "$TRACER" "$CODE/fork_demo" 2>&1 | grep -E 'clone|execve|wait4|exited' | head -8
  echo "(the child never execs — it stays fork_demo code throughout)"
else
  echo "(could not build $TRACER — skipping traced run)"
fi

say "Takeaway"
echo "fork returns twice (pid / 0); memory is copied (x diverges);"
echo "waitpid reaps (no zombie). The shell does this per command."
