/* frag.c — strand the top: free 90%, watch RSS refuse to move, then trim.
 *
 * Fills the heap with N x 1 KiB blocks (brk path), frees 90% in a pattern
 * that LEAVES one live block near the top, and prints mallinfo2 + RSS at
 * each stage: fordblks (free bytes) huge, RSS unmoved — external
 * fragmentation made of numbers. Then frees the pin, malloc_trim(0), and
 * RSS finally drops. THE §11.3 demo.
 *
 * Build:  make frag
 * Run:    ./frag 10000
 */
#define _GNU_SOURCE
#include <malloc.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

static long self_rss_kb(void)
{
    FILE *s = fopen("/proc/self/statm", "r");
    long pages = -1;
    if (s) {
        if (fscanf(s, "%*d %ld", &pages) != 1)
            pages = -1;
        fclose(s);
    }
    return pages < 0 ? -1 : pages * getpagesize() / 1024;
}

static void ledger(const char *when)
{
    struct mallinfo2 m = mallinfo2();
    printf("%-28s RSS=%7ldK arena=%8zuK uord=%8zuK ford=%8zuK blks=%zu\n",
           when, self_rss_kb(), m.arena / 1024, m.uordblks / 1024,
           m.fordblks / 1024, m.ordblks);
}

int main(int argc, char *argv[])
{
    long n = argc > 1 ? atol(argv[1]) : 10000;
    if (n <= 100 || n > 1000000) {
        fprintf(stderr, "usage: %s [blocks 101..1000000]\n", argv[0]);
        return 1;
    }
    void **b = malloc((size_t)n * sizeof(void *));
    if (!b) {
        perror("malloc table");
        return 1;
    }

    ledger("start:");
    for (long i = 0; i < n; i++) { /* 1 KiB each: firmly on the brk path */
        b[i] = malloc(1024);
        if (!b[i]) {
            perror("malloc");
            return 1;
        }
        ((char *)b[i])[0] = 0xAA; /* fault it: residency must be real */
        ((char *)b[i])[1023] = 0xBB;
    }
    ledger("after N x 1K allocs:");

    /* Free 90% — but KEEP every 10th block AND the very last one (the pin:
     * a live block at the top that forbids brk retreat). */
    for (long i = 0; i < n - 1; i++)
        if (i % 10 != 0)
            free(b[i]);
    ledger("freed 90% (pin kept):");

    malloc_trim(0); /* beg the allocator: does nothing — top is pinned */
    ledger("after malloc_trim(0):");

    for (long i = 0; i < n; i++) /* free the keepers + the pin */
        if (i % 10 == 0 || i == n - 1)
            free(b[i]);
    ledger("freed everything:");
    malloc_trim(0);
    ledger("after final trim:");

    free(b);
    return 0;
}
