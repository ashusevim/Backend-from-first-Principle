/* brkvsmap.c — find MMAP_THRESHOLD empirically: [heap] grew or anon grew?
 *
 * Allocates 1 KiB -> 8 MiB step by step. After each malloc it re-reads
 * /proc/self/maps and reports whether the [heap] VMA grew (brk path) or the
 * ANONYMOUS total grew (mmap path). Bytes, not VMA counts — the kernel
 * MERGES adjacent anon VMAs, so counting lines misses mmap'd chunks that
 * land next to existing ones (found the hard way). mallinfo2's hblkhd
 * (mmap'd bytes) is the independent witness. The size where the answer
 * flips is the LIVE threshold — MALLOC_MMAP_THRESHOLD_=... moves it.
 *
 * Build:  make brkvsmap
 * Run:    ./brkvsmap
 *         MALLOC_MMAP_THRESHOLD_=1048576 ./brkvsmap
 */
#define _GNU_SOURCE
#include <malloc.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Sum of [heap] bytes. */
static unsigned long heap_bytes(void)
{
    FILE *f = fopen("/proc/self/maps", "r");
    char line[512];
    unsigned long total = 0;
    while (fgets(line, sizeof(line), f)) {
        if (!strstr(line, "[heap]"))
            continue;
        unsigned long lo, hi;
        if (sscanf(line, "%lx-%lx", &lo, &hi) == 2)
            total += hi - lo;
    }
    fclose(f);
    return total;
}

/* Sum of anonymous (no-path) rw-p bytes. Merge-proof, unlike a VMA count. */
static unsigned long anon_bytes(void)
{
    FILE *f = fopen("/proc/self/maps", "r");
    char line[512];
    unsigned long total = 0;
    while (fgets(line, sizeof(line), f)) {
        char perms[5];
        unsigned long lo, hi, off;
        int pn = 0;
        if (sscanf(line, "%lx-%lx %4s %lx %*s %*s %n", &lo, &hi, perms, &off,
                   &pn) < 4)
            continue;
        if (strcmp(perms, "rw-p") != 0)
            continue;
        const char *rest = line + pn + strspn(line + pn, " \t");
        if (*rest == '\n' || *rest == '\0')
            total += hi - lo;
    }
    fclose(f);
    return total;
}

int main(void)
{
    /* Touch the allocator first so libc's own setup isn't misattributed. */
    void *warm = malloc(1);
    free(warm);

    printf("%-10s %-12s %-12s %-12s %s\n", "SIZE", "HEAP", "ANON", "HBLKHD",
           "PATH?");
    size_t sizes[] = { 1024, 4096, 16384, 65536, 131072 - 1024, 131072,
                       262144, 1048576, 8 * 1048576 };
    for (unsigned i = 0; i < sizeof(sizes) / sizeof(sizes[0]); i++) {
        unsigned long h0 = heap_bytes(), n0 = anon_bytes();
        /* volatile + touch: the chunk must be REAL (faulted), like frag.c */
        volatile unsigned char *p = malloc(sizes[i]);
        if (!p) {
            printf("%-10zu malloc FAILED\n", sizes[i]);
            continue;
        }
        for (size_t o = 0; o < sizes[i]; o += 4096)
            p[o] = 0xAA;
        unsigned long h1 = heap_bytes(), n1 = anon_bytes();
        size_t hb = mallinfo2().hblkhd;
        printf("%-10zu %-12lu %-12lu %-12zu %s\n", sizes[i], h1, n1, hb,
               n1 > n0 ? "mmap (anon total grew)"
               : h1 > h0 ? "brk  ([heap] grew)"
                         : "heap (absorbed: bins/top, no growth)");
        free((void *)p);
    }
    printf("(the flip near 128K is MMAP_THRESHOLD; hblkhd confirms mmap path)\n");
    return 0;
}
