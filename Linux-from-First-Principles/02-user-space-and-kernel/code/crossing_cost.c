/* crossing_cost.c — Measure the price of the user→kernel gate.
 *
 * Times N empty loop iterations vs N getpid() syscalls. getpid() does almost
 * no work in the kernel (returns one int), so the gap is ~pure transition
 * cost: syscall + KPTI + Spectre guards + sysret.
 *
 * Build:  make crossing_cost
 * Run:    ./crossing_cost [iterations]
 */
#define _POSIX_C_SOURCE 199309L /* clock_gettime */
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

static long elapsed_ns(struct timespec a, struct timespec b)
{
    return (b.tv_sec - a.tv_sec) * 1000000000L + (b.tv_nsec - a.tv_nsec);
}

int main(int argc, char *argv[])
{
    long n = argc > 1 ? atol(argv[1]) : 2000000;
    if (n <= 0)
        n = 2000000;

    struct timespec t0, t1;
    volatile pid_t sink; /* volatile: don't let the compiler delete the calls */

    /* Baseline: function-call-free loop of equal shape. */
    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (long i = 0; i < n; i++)
        sink = (pid_t)i;
    clock_gettime(CLOCK_MONOTONIC, &t1);
    long base = elapsed_ns(t0, t1);

    clock_gettime(CLOCK_MONOTONIC, &t0);
    for (long i = 0; i < n; i++)
        sink = getpid();
    clock_gettime(CLOCK_MONOTONIC, &t1);
    long total = elapsed_ns(t0, t1);

    (void)sink;
    printf("iterations : %ld\n", n);
    printf("empty loop : %8.1f ns/op\n", (double)base / n);
    printf("getpid()   : %8.1f ns/op  (~%.0fx the loop — that gap is the gate)\n",
           (double)total / n, (double)total / (base ? base : 1));
    return 0;
}
