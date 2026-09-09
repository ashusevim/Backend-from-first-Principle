#!/usr/bin/env bash
# 03-minish-session.sh — Scripted minish run: builtins, bg jobs, failures.
# Run: ./03-minish-session.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" minish 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Scripted session (stdin is a pipe, so no prompt — commands echoed by us)"
run() { printf '$ %s\n' "$*" >&2; printf '%s\n' "$*"; sleep 0.1; }  # echo->stderr, cmd->minish, paced
{
  run /bin/echo hello-from-minish
  run cd /tmp
  run pwd
  run nosuchcommand-xyz
  run sleep 0.3 '&'
  run /bin/echo bg-job-started
  run sleep 0.5
  run exit
} | "$CODE/minish"

say "2. minish exit code propagates cleanly"
printf 'exit\n' | "$CODE/minish" >/dev/null
echo "scripted 'exit' -> minish returned $?"

say "Takeaway"
echo "That was fork+execvp+waitpid per line, chdir in-process for cd, and"
echo "WNOHANG reaping for &. Now run $CODE/minish yourself — try a pipeline"
echo "background job, a bad cd, and Ctrl-C (what happens? that's Section 07)."
