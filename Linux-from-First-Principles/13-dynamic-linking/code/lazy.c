/* lazy.c — lazy binding, staged: prints BETWEEN the calls that bind them.
 *
 * Calls a() (liba.so) then b() (libb.so) with marker prints around each.
 * Under LD_DEBUG=bindings, a's binding line appears at the FIRST call and
 * b's at the SECOND — the loader resolves on demand. LD_BIND_NOW=1 moves
 * all bindings before the first print. fflush after every print: stdout
 * is block-buffered under capture, and the S08 lesson says merged
 * stdout+stderr only keeps true order if you flush (else all prints land
 * at the end and the demo lies).
 *
 * Build:  make lazy
 * Run:    ./lazy
 *         LD_DEBUG=bindings ./lazy 2>&1 | grep -E 'lazy:|binding.*sym'
 */
#include <stdio.h>
#include "libab.h"

static void mark(const char *s)
{
    printf("lazy: %s\n", s);
    fflush(stdout); /* S08: keep merged-capture order truthful */
}

int main(void)
{
    mark("before a()");
    a();
    mark("between (a bound, b not yet)");
    b();
    mark("after (both bound)");
    return 0;
}
