#!/usr/bin/env bash
# 01-fd-table-tour.sh — Grow/shrink YOUR shell's fd table live (pure bash).
# Run: ./01-fd-table-tour.sh
set -u
say() { printf '\n=== %s ===\n' "$*"; }
F=/tmp/fd-tour-$$.txt
rm -f "$F"

say "1. Baseline: this script's fd table (0,1,2 + script itself + inherited extras)"
ls -l /proc/$$/fd | awk 'NR>1 {print $9, $10, $11}'
# Two-step capture: a direct $(ls ...) would hold the capture PIPE open in US
# (at fd 3!) while ls runs — ls would list the observer. Via a temp file,
# the parent holds nothing extra during the listing. (§01 observer effect!)
ls /proc/$$/fd | sort > /tmp/fdlist-$$.txt
BASE=$(tr '\n' ' ' < /tmp/fdlist-$$.txt)

say "2. Open fds 3 (write) and 4 (read) on a scratch file"
exec 3>"$F"
echo "line-via-fd3" >&3
exec 4<"$F"
ls -l /proc/$$/fd/{3,4}

say "3. fds are just numbers: read back through fd 4 (opened after the write, so offset 0)"
cat <&4
exec 4<&-   # close fd 4 (the read description dies: refcount 0)
echo "(fd 4 closed)"

say "4. dup2 in bash: point fd 1 at a file, then restore (save first!)"
exec 7>&1            # fd 7 := alias of current stdout (dup!)
exec >"$F"           # fd 1 := the file (dup2, truncates)
echo "line-via-redirected-stdout"
exec 1>&7            # fd 1 := alias back (dup2 restore)
exec 7>&-            # close the spare alias
cat "$F"             # only the redirected line: '>' truncated (O_TRUNC wiped line-via-fd3)

say "5. Cleanup: close fd 3, drop the scratch file"
exec 3>&-
rm -f "$F"
ls /proc/$$/fd | sort > /tmp/fdlist-$$.txt   # two-step again: no $() pipe to observe
NOW=$(tr '\n' ' ' < /tmp/fdlist-$$.txt)
rm -f /tmp/fdlist-$$.txt
echo "baseline fds: $BASE"
echo "now fds:      $NOW"
echo "(ours are all closed; low inherited numbers may differ — reusing fd 4/7"
echo " closed our own copies of sandbox extras, which is harmless)"

say "Takeaway"
echo "exec N>file opens, N>&M dups, N>&- closes — bash's syntax over the"
echo "same three syscalls (open/dup2/close) that redirect.c uses in C."
