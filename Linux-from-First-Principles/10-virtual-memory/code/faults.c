/* faults.c — demand paging, measured: mmap N MiB, prove 0-resident, touch all.
 *
 * Timeline: mmap (area only) -> mincore (resident? ~0) -> touch every page
 * -> minflt delta ~= page count -> touch AGAIN (delta ~= 0: already wired).
 * RSS from statm shows the §10.2 headline: VSZ=N MiB while RSS starts ~0.
 *
 * Build:  make faults
 * Run:    ./faults 256
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <time.h>
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

static long self_minflt(void)
{
    struct rusage ru;
    getrusage(RUSAGE_SELF, &ru);
    return ru.ru_minflt;
}

static double now_sec(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec / 1e9;
}

int main(int argc, char *argv[])
{
    long mb = argc > 1 ? atol(argv[1]) : 256;
    if (mb <= 0 || mb > 8192) {
        fprintf(stderr, "usage: %s [MiB, 1..8192]\n", argv[0]);
        return 1;
    }
    long ps = getpagesize();
    size_t len = (size_t)mb * 1024 * 1024;
    size_t npages = len / (size_t)ps;

    unsigned char *p =
        mmap(NULL, len, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) {
        perror("mmap");
        return 1;
    }
    /* Touch one byte per page WITHOUT faulting it in yet is impossible —
     * so residency is measured with mincore (a pure query, no faults). */
    unsigned char *vec = malloc(npages);
    if (!vec) {
        perror("malloc vec");
        return 1;
    }
    size_t resident = 0;
    if (mincore(p, len, vec) == 0)
        for (size_t i = 0; i < npages; i++)
            resident += vec[i] & 1;

    printf("mmap'd %ld MiB (%zu pages), touched nothing yet:\n", mb, npages);
    printf("  VSZ contribution: %ld MiB   RSS(self): %ld KiB   resident pages: %zu\n",
           mb, self_rss_kb(), resident);

    long f0 = self_minflt();
    double t0 = now_sec();
    for (size_t i = 0; i < npages; i++)
        p[i * (size_t)ps] = 0xAB; /* first touch: minor fault per page */
    double t1 = now_sec();
    long f1 = self_minflt();

    resident = 0;
    if (mincore(p, len, vec) == 0)
        for (size_t i = 0; i < npages; i++)
            resident += vec[i] & 1;
    printf("after touching every page once (%.2fs, %.0f MiB/s):\n", t1 - t0,
           mb / (t1 - t0));
    printf("  minor faults: %ld (~1/page: %s)   RSS: %ld KiB   resident: %zu/%zu\n",
           f1 - f0, (f1 - f0 >= (long)npages * 9 / 10) ? "demand paging!" : "hmm?",
           self_rss_kb(), resident, npages);

    long f2 = self_minflt(); /* second pass: everything wired, ~0 faults */
    for (size_t i = 0; i < npages; i++)
        p[i * (size_t)ps] = 0xCD;
    long f3 = self_minflt();
    printf("second full pass: %ld new faults (wired pages don't fault)\n", f3 - f2);

    free(vec);
    munmap(p, len);
    return 0;
}
