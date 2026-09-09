/* ctxcount.c — Voluntary vs involuntary context switches, made physical.
 *
 * Two modes, same wall time, opposite counters:
 *   spin  — burn CPU: the kernel PREEMPTS you (involuntary switches climb).
 *   sleep — nanosleep in a loop: YOU yield (voluntary switches climb).
 * Counters come from getrusage() — the same source as /usr/bin/time -v.
 *
 * Build:  make ctxcount
 * Run:    ./ctxcount spin 2
 *         ./ctxcount sleep 2
 *         taskset -c 0 ./spinner 30 & taskset -c 0 ./ctxcount spin 3  # contention!
 */
#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <time.h>
#include <unistd.h>

static double now(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1e9;
}

static void report(const char *label, struct rusage *before)
{
    struct rusage after;
    getrusage(RUSAGE_SELF, &after);
    printf("%-6s voluntary=%ld involuntary=%ld  (delta over the run)\n", label,
           after.ru_nvcsw - before->ru_nvcsw,
           after.ru_nivcsw - before->ru_nivcsw);
}

int main(int argc, char *argv[])
{
    if (argc < 2 || (strcmp(argv[1], "spin") != 0 && strcmp(argv[1], "sleep") != 0)) {
        fprintf(stderr, "usage: %s {spin|sleep} [seconds]\n", argv[0]);
        return 1;
    }
    double secs = argc > 2 ? atof(argv[2]) : 2.0;
    if (secs <= 0)
        secs = 2.0;

    struct rusage before;
    getrusage(RUSAGE_SELF, &before);

    double end = now() + secs;
    if (strcmp(argv[1], "spin") == 0) {
        volatile unsigned long long acc = 0;
        while (now() < end)
            for (int i = 0; i < 10000; i++)
                acc += (unsigned long long)(i * 2654435761u);
        (void)acc;
        report("spin", &before);
    } else {
        struct timespec nap = { .tv_sec = 0, .tv_nsec = 10 * 1000 * 1000 };
        while (now() < end)
            nanosleep(&nap, NULL); /* each sleep = a voluntary switch */
        report("sleep", &before);
    }
    return 0;
}
