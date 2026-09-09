#!/usr/bin/env bash
# 03-libc-vs-raw-vs-asm.sh — Same output, different paths through the system.
# Run: ./03-libc-vs-raw-vs-asm.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. All three print (nearly) the same bytes, all exit 0"
for p in hello_libc hello_raw hello_asm; do
  printf '%-11s │ ' "$p"; "$CODE/$p"; echo "  (exit $?)"
done

say "2. ...but the binaries differ: dynamic loader vs none"
for p in hello_libc hello_raw hello_asm; do
  interp=$(readelf -l "$CODE/$p" 2>/dev/null | grep -o '/[^] ]*ld-linux[^] ]*' || true)
  size=$(stat -c %s "$CODE/$p")
  printf '%-11s │ %7s bytes │ interp: %s\n' "$p" "$size" "${interp:-(none — kernel loads it directly)}"
done

say "3. ...and the traces differ: loader burst vs 2 syscalls"
if command -v strace >/dev/null; then
  for p in hello_libc hello_asm; do
    n=$(strace -o /tmp/c.log "$CODE/$p" 2>/dev/null; grep -c . /tmp/c.log)
    printf '%-11s │ %s syscalls\n' "$p" "$n"
  done
else
  for p in hello_libc hello_asm; do
    n=$("$CODE/mini-strace" "$CODE/$p" 2>&1 | grep -c '= ')
    printf '%-11s │ %s syscalls (via mini-strace)\n' "$p" "$n"
  done
fi
rm -f /tmp/c.log

say "4. vDSO check: clock_gettime crosses nothing"
"$CODE/mini-strace" "$CODE/vdso_demo" 2>&1 | grep -E 'getpid|clock_gettime|pid=' || true
echo "(above: getpid traced, clock_gettime absent, yet the time printed — vDSO.)"

say "Takeaway"
echo "Section 12 explains the loader burst (ELF + ld-linux); for now, notice"
echo "how much happens before main() — and that raw asm skips ALL of it."
