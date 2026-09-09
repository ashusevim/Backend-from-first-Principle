#!/usr/bin/env bash
# 01-signal-tour.sh — kill -l, TERM vs KILL, signal-0 probe, survival test.
# Run: ./01-signal-tour.sh   (self-cleaning)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
cleanup() { kill -KILL "$A" "$B" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

say "1. The vocabulary (your system's signal names)"
kill -l | head -3

say "2. TERM (polite) vs KILL (unstoppable)"
sleep 60 & A=$!
sleep 60 & B=$!
disown "$A" "$B"   # forget the jobs: no "Killed" chatter from bash (we check via kill -0)
echo "started sleepers: A=$A B=$B"
kill -0 "$A" && echo "signal 0 to A: exists and signalable (no signal sent!)"
kill -TERM "$A"
sleep 0.2
kill -0 "$A" 2>/dev/null && echo "A SURVIVED TERM?!" || echo "A is gone (default TERM disposition)"
wait "$A" 2>/dev/null || true   # reap quietly (else bash prints "Terminated")
echo "--- B meets KILL directly ---"
kill -KILL "$B"
sleep 0.2
kill -0 "$B" 2>/dev/null && echo "B SURVIVED KILL?!" || echo "B is gone (SIGKILL: no handler, no negotiation)"
wait "$B" 2>/dev/null || true   # reap quietly (else bash prints "Killed")

say "3. Survival test: trap '' TERM (ignore) survives TERM, not KILL"
bash -c 'trap "" TERM; sleep 60' & B=$!
disown "$B"
sleep 0.2
kill -TERM "$B"; sleep 0.2
kill -0 "$B" 2>/dev/null && echo "trapper SURVIVED TERM (SIG_IGN honors ignore)" || echo "trapper died?!"
kill -KILL "$B"; sleep 0.2
kill -0 "$B" 2>/dev/null && echo "SURVIVED KILL?! (impossible — report!)" || echo "trapper is gone (KILL is unblockable)"
wait "$B" 2>/dev/null || true

say "4. STOP/CONT: suspend and resume a process"
sleep 60 & B=$!
disown "$B"
sleep 0.2   # let the child exec first (else STOP lands pre-exec: ps shows bash!)
kill -STOP "$B"; sleep 0.2
ps -o pid,stat,cmd -p "$B" | tail -1
kill -CONT "$B"; sleep 0.2
ps -o pid,stat,cmd -p "$B" | tail -1
kill -KILL "$B" 2>/dev/null
wait "$B" 2>/dev/null || true

say "Takeaway"
echo "TERM asks, KILL enforces, STOP suspends, 0 probes. Ignoring works for"
echo "everything except the uncatchable two — that exception IS the design."
