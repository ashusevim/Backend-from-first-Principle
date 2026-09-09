/* spinner.c — Burn exactly one CPU for N seconds. That's it.
 *
 * The lab rat of this section: run two pinned to one CPU and watch CFS split
 * it fairly; nice one and watch the shares skew by weight. Burns user-mode
 * CPU only (no syscalls in the loop), so `time` shows user≈CPU-granted.
 *
 * Build:  make spinner
 * Run:    ./spinner 2
 *         taskset -c 0 ./spinner 2 & taskset -c 0 ./spinner 2 & wait
 */
#define _GNU_SOURCE /* clock_gettime, sched_getcpu */
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>

static double now(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1e9;
}

int main(int argc, char *argv[])
{
    double secs = argc > 1 ? atof(argv[1]) : 2.0;
    if (secs <= 0)
        secs = 2.0;

    double start = now(), end = start + secs;
    volatile unsigned long long acc = 0; /* volatile: no loop elision */
    unsigned long long iters = 0;
    while (now() < end) {
        for (int i = 0; i < 10000; i++)
            acc += (unsigned long long)(i * 2654435761u);
        iters++;
    }

    double wall = now() - start;
    printf("pid=%d burned %.2fs wall, %llu iters (%llu), cpu %d\n",
           (int)getpid(), wall, iters, acc,
           sched_getcpu());
    return 0;
}
