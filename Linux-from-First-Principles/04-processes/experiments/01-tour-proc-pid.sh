#!/usr/bin/env bash
# 01-tour-proc-pid.sh — Guided tour of /proc/$$ (this shell's own entry).
# Run: ./01-tour-proc-pid.sh
set -u
say() { printf '\n=== %s ===\n' "$*"; }
P="/proc/$$"

say "1. Identity + state (what ps formats for you)"
grep -E '^(Name|State|Tgid|Pid|PPid|TracerPid|Uid|Gid|Threads)' "$P/status"

say "2. The machine-readable twin: stat (ONE line, 52+ fields)"
cut -c1-160 "$P/stat"; echo "   ... ($(wc -w < "$P/stat" | tr -d ' ') whitespace-separated tokens)"

say "3. How this process was born: cmdline + starttime"
echo -n "cmdline: "; tr '\0' ' ' < "$P/cmdline"; echo
awk '{print "started " $22/100 " seconds after boot (field 22, in jiffies)"}' "$P/stat"

say "4. Context: what binary, where, rooted at what"
ls -l "$P/exe" "$P/cwd" "$P/root" | awk '{print $9, "->", $11}'

say "5. Resources (deep dives in later sections)"
echo "open fds : $(ls "$P/fd" | wc -l)          (Section 08)"
echo "mappings : $(wc -l < "$P/maps") lines in maps   (Section 10)"
echo "threads  : $(ls "$P/task" | wc -l) in task/        (Section 14)"
echo "environ  : $(tr '\0' '\n' < "$P/environ" | wc -l) variables         (Section 12)"

say "6. Bonus: your own kernel stack, live"
cat "$P/stack" 2>/dev/null || echo "(stack hidden on this kernel — needs privilege)"
