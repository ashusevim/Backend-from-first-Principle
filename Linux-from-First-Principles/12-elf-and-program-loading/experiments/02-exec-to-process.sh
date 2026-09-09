#!/bin/bash
# 02 — exec to process: the execve seam under mini_strace + auxv letter.
# SAFE: read-only (traces /bin/true).
#
# Run:  bash 02-exec-to-process.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s auxv
CODEDIR=$PWD
S03="$EXPDIR/../../03-system-calls/code"

echo "=== 1. the seam: everything between execve and birth is INVISIBLE ==="
PREBUILT=0; [ -x "$S03/mini_strace" ] && PREBUILT=1
if (cd "$S03" && make -s mini_strace 2>/dev/null) && [ -x "$S03/mini_strace" ]; then
    "$S03/mini_strace" /bin/true > /tmp/exec.trace 2>&1
    echo "first 6 post-exec syscalls (the loader + libc, in userspace):"
    grep -vE 'execve|>>>|^= 0$' /tmp/exec.trace | head -6 | sed 's/^/  /'
    echo "---"
    echo "the binary's own LOAD mmaps appear NOWHERE above: they happened"
    echo "INSIDE execve (kernel-side). ld.so's libc mmaps: visible below."
    grep -c 'mmap(' /tmp/exec.trace | xargs -I{} echo "mmap calls in trace: {} (all loader/libc — §13)"
    [ $PREBUILT -eq 0 ] && rm -f "$S03/mini_strace"
    rm -f /tmp/exec.trace
else
    echo "(no tracer available — §03's mini_strace didn't build here)"
fi

echo
echo "=== 2. the birth letter: auxv decoded ==="
"$CODEDIR/auxv" | head -22

echo
echo "=== 3. static vs dynamic (the INTERP fork) ==="
echo 'int main(){return 0;}' > /tmp/st.c
if gcc -static /tmp/st.c -o /tmp/st 2>/dev/null; then
    echo "static:   $("$CODEDIR/elfhead" /tmp/st 2>/dev/null | grep -c INTERP) INTERP (kernel jumps to YOUR entry)"
    echo "dynamic:  $("$CODEDIR/elfhead" /bin/true | grep -c INTERP) INTERP (kernel jumps to ld.so — §13)"
    echo "sizes: static hello=$(stat -c %s /tmp/st) vs dynamic /bin/true=$(stat -c %s /bin/true) (libc lives INSIDE the static one)"
    rm -f /tmp/st.c /tmp/st
else
    echo "(no static libc here — dynamic only; /bin/true has INTERP, trust §12.5's table)"
    rm -f /tmp/st.c
fi
