#!/usr/bin/env bash
# 02-states-in-action.sh — Put real processes into S, R, T and see each live.
# Self-cleaning: every spawned process is killed before exit.
# Run: ./02-states-in-action.sh
set -u
say() { printf '\n=== %s ===\n' "$*"; }
show() { ps -o pid,stat,wchan:22,cmd -p "$1" | tail -1; }
cleanup() { kill "$SLEEPER" "$SPINNER" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

say "1. S state: sleeping, waiting for time (killable)"
sleep 60 &
SLEEPER=$!
show "$SLEEPER"

say "2. R state: runnable (spinning on CPU — sampled, may flicker S/R)"
bash -c 'while :; do :; done' &
SPINNER=$!
sleep 0.3
show "$SPINNER"

say "3. T state: STOPped (SIGSTOP suspends; the shell's Ctrl-Z does SIGTSTP)"
kill -STOP "$SLEEPER"
sleep 0.2
show "$SLEEPER"
echo "--- and SIGCONT resumes it ---"
kill -CONT "$SLEEPER"
sleep 0.2
show "$SLEEPER"

say "4. Z state needs a dead-but-unreaped child — that's Section 05's lab"
echo "(spoiler: zombie.c + ps showing 'Z' / <defunct>)"

say "Takeaway"
echo "Letters are the scheduler's truth: R = wants CPU, S = waits killably,"
echo "T = suspended. D (unkillable driver sleep) can't be demoed safely here —"
echo "read notes/process-states.md for why kill -9 bounces off it."
