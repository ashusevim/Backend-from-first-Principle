#!/usr/bin/env bash
# 02-zombie-orphan-lab.sh — Watch Z appear + vanish; watch PPID jump.
# Run: ./02-zombie-orphan-lab.sh   (from this directory; ~12s, self-cleaning)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" zombie orphan 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Zombie: child dead, parent napping (6s window)"
"$CODE/zombie" 6 &
ZP=$!
sleep 1
echo "--- ps while the parent naps (spot Z + <defunct>) ---"
ps -o pid,ppid,stat,cmd -p "$ZP" --ppid "$ZP"
wait "$ZP"

say "2. Orphan: parent exits at once, child outlives it"
"$CODE/orphan"
sleep 6  # let the orphan print its second line before we move on

say "3. No strays left behind?"
if ps -o pid,ppid,stat,cmd --ppid $$ | grep -E '[z]ombie|[o]rphan'; then
  echo "STRAYS FOUND (please report!)"
else
  echo "clean: zombie reaped by its parent, orphan reaped by its adopter"
fi

say "Takeaway"
echo "No wait + live parent = zombie. Dead parent = reparent + instant reap."
echo "A process ALWAYS has exactly one parent — the kernel guarantees it."
