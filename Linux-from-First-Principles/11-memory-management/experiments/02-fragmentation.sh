#!/bin/bash
# 02 — Fragmentation: strand the top; mallinfo2 + RSS; trace the trim.
# SAFE: transient ~10MB heap, all freed. Compiles a snippet to /tmp.
#
# Run:  bash 02-fragmentation.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s frag
CODEDIR=$PWD
S03="$EXPDIR/../../03-system-calls/code"

echo "=== 1. the story: free 90%, RSS frozen; trim, trim again ==="
"$CODEDIR/frag" 10000
echo "(read it: fordblks frozen while RSS falls = RAM returned, VMA kept)"

echo
echo "=== 2. trim's true shape: 1 brk-shrink + ~1000 madvises (traced) ==="
PREBUILT=0; [ -x "$S03/mini_strace" ] && PREBUILT=1
if (cd "$S03" && make -s mini_strace 2>/dev/null) && [ -x "$S03/mini_strace" ]; then
    "$S03/mini_strace" "$CODEDIR/frag" 10000 > /tmp/frag.trace 2>&1
    echo "madvise (sys_28) calls: $(grep -c 'sys_28' /tmp/frag.trace) (advice 0x4 = DONTNEED)"
    echo "lens: ~999 small fragments (trim1: pinned, per-run) + ONE huge range:"
    grep 'sys_28' /tmp/frag.trace | sed 's/sys_28(0x[0-9a-f]*, \(0x[0-9a-f]*\).*/\1/' | sort | uniq -c | sort -rn | sed 's/^/  /'
    echo "(that 0x9e8000 ~= 9.7MB single call = trim2's merged heap, one shot)"
    echo "brk: growth ... then ONE shrink (last two calls — high-water vs down):"
    grep 'brk(' /tmp/frag.trace | tail -2 | sed 's/^/  /'
    [ $PREBUILT -eq 0 ] && rm -f "$S03/mini_strace"
    rm -f /tmp/frag.trace
else
    echo "(no tracer available — §03's mini_strace didn't build here)"
fi

echo
echo "=== 3. the observer pins the VMA (no-observer build: VMA -> ~88K) ==="
cat > /tmp/noledger.c <<'EOF'
#include <malloc.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
int main(void) {
    long n = 10000;
    void **b = malloc((size_t)n * sizeof(void *));
    for (long i = 0; i < n; i++) { b[i] = malloc(1024); ((char *)b[i])[0] = 1; }
    for (long i = 0; i < n; i++) free(b[i]);
    malloc_trim(0);   /* trim decides with ZERO mid-run measurements */
    FILE *s = fopen("/proc/self/statm", "r"); long p;
    fscanf(s, "%*d %ld", &p); fclose(s);
    FILE *f = fopen("/proc/self/maps", "r"); char l[512];
    unsigned long t = 0, lo, hi;
    while (fgets(l, sizeof l, f))
        if (strstr(l, "[heap]") && sscanf(l, "%lx-%lx", &lo, &hi) == 2) t += hi - lo;
    fclose(f);
    printf("no-observer trim: RSS=%ldK heapVMA=%luK\n", p * getpagesize() / 1024, t / 1024);
    return 0;
}
EOF
gcc -Wall -O2 /tmp/noledger.c -o /tmp/noledger && /tmp/noledger
rm -f /tmp/noledger.c /tmp/noledger
echo "(frag.c froze at ~10M VMA; same frees, no observers: ~88K. §11.3's artifact, reproduced.)"
