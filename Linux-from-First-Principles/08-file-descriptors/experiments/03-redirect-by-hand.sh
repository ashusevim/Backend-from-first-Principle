#!/usr/bin/env bash
# 03-redirect-by-hand.sh — redirect.c vs the real shell: diffed, identical.
# Run: ./03-redirect-by-hand.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"
OUT="$CODE/redirect-out.txt"

say "0. Building"
make -C "$CODE" redirect 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. Our redirection: ./redirect /bin/echo hello-fd"
(cd "$CODE" && ./redirect /bin/echo hello-fd)
echo "--- file says:"; cat "$OUT"

say "2. The shell's redirection, same bytes"
(cd "$CODE" && /bin/echo hello-fd > shell-out.txt)
if diff -q "$OUT" "$CODE/shell-out.txt" >/dev/null; then
  echo "IDENTICAL: our open+dup2+close+exec == the shell's '>'"
else
  echo "DIFFERENT (report!):"; diff "$OUT" "$CODE/shell-out.txt" || true
fi
rm -f "$CODE/shell-out.txt"

say "3. The 1971 trick: lowest-free-fd (close 1, next open takes it)"
bash -c 'exec 7>&1; exec 1>/tmp/ancient.txt; echo "no-dup2-needed"; exec 1>&7; exec 7>&-'
cat /tmp/ancient.txt; rm -f /tmp/ancient.txt
echo "(exec 1>file closed 1 and opened the file onto it — same mechanism)"

say "4. Bonus: /dev/fd — your own fds as paths"
/bin/echo "via-dev-fd" > /dev/fd/1
cat /dev/fd/0 <<< "via-dev-fd-stdin"

say "Takeaway"
echo "Four syscalls (open/dup2/close/exec) + wait == every '>' you ever typed."
rm -f "$OUT"
