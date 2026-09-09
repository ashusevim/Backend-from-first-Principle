/* arenas.c — malloc goes multicore: T threads, T arenas, T x 64M of VSZ.
 *
 * Each thread holds 64 KiB on the HEAP path (small enough to need an arena,
 * big enough to matter — 1 MiB would take the mmap path and bypass arenas
 * entirely!). A thread's first heap malloc spreads it onto its own arena:
 * the main arena ([heap]) plus non-main arenas, each visible as a
 * committed rw-p sliver + a ~64 MiB ---p RESERVATION. The census counts
 * those 64M reservations: that virtual sprawl is the "VSZ in gigabytes"
 * symptom. MALLOC_ARENA_MAX=2 caps it — same program, fewer arenas.
 *
 * Build:  make arenas
 * Run:    ./arenas 8
 *         MALLOC_ARENA_MAX=2 ./arenas 8
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define HOLD (64 * 1024) /* heap path (< 128K threshold): MUST use an arena */

static void *holder(void *arg)
{
    (void)arg;
    volatile unsigned char *p = malloc(HOLD);
    if (!p)
        return NULL;
    for (size_t o = 0; o < HOLD; o += 4096)
        p[o] = 0xCC;
    sleep(3); /* hold it while main counts arenas (poor man's barrier) */
    unsigned sum = 0; /* checksum: keep the memset+hold optimisation-proof */
    for (size_t o = 0; o < HOLD; o += 4096)
        sum += p[o];
    free((void *)p);
    return (void *)(unsigned long)(sum & 0xFF);
}

/* Non-main arenas reserve ~64 MiB PROT_NONE each: unmistakable signature. */
static void census(void)
{
    FILE *f = fopen("/proc/self/maps", "r");
    char line[512];
    long heaps = 0, reserv = 0;
    unsigned long long rbytes = 0;
    while (fgets(line, sizeof(line), f)) {
        if (strstr(line, "[heap]")) {
            heaps++;
            continue;
        }
        unsigned long lo, hi, off;
        char perms[5];
        int pn = 0;
        if (sscanf(line, "%lx-%lx %4s %lx %*s %*s %n", &lo, &hi, perms, &off,
                   &pn) < 4)
            continue;
        const char *rest = line + pn + strspn(line + pn, " \t");
        if (!(*rest == '\n' || *rest == '\0'))
            continue; /* named mapping: not an arena slice */
        if (perms[0] == '-' && hi - lo >= 32 * 1024 * 1024) {
            reserv++;
            rbytes += hi - lo;
        }
    }
    fclose(f);
    printf("census: [heap]=%ld  64M-reservations=%ld  reserved VIRTUAL=%.0fM\n",
           heaps, reserv, rbytes / 1048576.0);
    printf("(arenas ~= %ld; each thread spread onto its own — compare ARENA_MAX=2)\n",
           heaps + reserv);
}

int main(int argc, char *argv[])
{
    long t = argc > 1 ? atol(argv[1]) : 8;
    if (t < 1 || t > 64) {
        fprintf(stderr, "usage: %s [threads 1..64]\n", argv[0]);
        return 1;
    }
    /* 256K stacks: default 8M stacks would drown the maps in noise. */
    pthread_attr_t at;
    pthread_attr_init(&at);
    pthread_attr_setstacksize(&at, 256 * 1024);
    pthread_t *th = malloc((size_t)t * sizeof(pthread_t));
    if (!th) {
        perror("malloc");
        return 1;
    }
    printf("%ld threads x 64 KiB (heap path) held simultaneously...\n", t);
    for (long i = 0; i < t; i++)
        if (pthread_create(&th[i], &at, holder, NULL) != 0) {
            perror("pthread_create");
            return 1;
        }
    pthread_attr_destroy(&at);
    sleep(1); /* let every thread fault its hold in */
    census();
    for (long i = 0; i < t; i++)
        pthread_join(th[i], NULL);
    free(th);
    return 0;
}
