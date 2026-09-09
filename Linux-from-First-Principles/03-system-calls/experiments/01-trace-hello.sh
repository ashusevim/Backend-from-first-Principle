#!/usr/bin/env bash
# 01-trace-hello.sh — Trace all three hello-worlds; compare the crossings.
# Uses real `strace` when installed, else this section's ./mini-strace.
# Run: ./01-trace-hello.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building the section's programs"
make -C "$CODE" 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

if command -v strace >/dev/null; then
  TRACER="strace -o"
  echo "tracer: system strace"
  trace() { strace -o "$1" "${@:2}"; }  # trace <logfile> <cmd...>
  count() { grep -c . "$1"; }
else
  echo "tracer: mini-strace (built in this section — strace not installed)"
  trace() { "$CODE/mini-strace" "${@:2}" > "$1" 2>&1; }
  count() { grep -c ')\|+++' "$1"; }
fi

for prog in hello_libc hello_raw hello_asm; do
  say "Tracing $prog"
  trace "/tmp/trace-$prog.log" "$CODE/$prog"
  echo "--- first 5 crossings ---"
  head -5 "/tmp/trace-$prog.log"
  echo "..."
  echo "--- last 3 crossings ---"
  tail -3 "/tmp/trace-$prog.log"
  echo "TOTAL crossings: $(count "/tmp/trace-$prog.log")"
done

say "Takeaway"
echo "Same output on stdout; wildly different syscall counts."
echo "The libc/raw binaries pay a ~30-syscall loader+init burst before main()."
echo "The asm trace is 3 entries: the execve that launched it, plus its own"
echo "write and exit_group (the only 2 syscalls the binary itself issues)."
rm -f /tmp/trace-hello_libc.log /tmp/trace-hello_raw.log /tmp/trace-hello_asm.log
