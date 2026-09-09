/* libhook.c — LD_PRELOAD puts-hook: prefix every line [HOOKED].
 *
 * LD_PRELOAD puts this lib FIRST in symbol order, so OUR puts shadows
 * libc's for the whole run. Implemented via fputs (calling puts here
 * would recurse into ourselves forever). Harmless, reversible, loud.
 *
 * Build:  make libhook.so
 * Run:    LD_PRELOAD=./libhook.so ./whofirst
 */
#include <stdio.h>

int puts(const char *s)
{
    fputs("[HOOKED] ", stdout);
    fputs(s, stdout);
    return fputc('\n', stdout);
}
