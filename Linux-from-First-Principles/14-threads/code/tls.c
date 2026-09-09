/* tls.c — same loop, two storage classes: shared (racy) vs TLS (exact).
 *
 * Each thread increments a SHARED counter (loses updates, like race.c)
 * AND its own __thread counter (private curtain: full count, every time).
 * Threads RETURN their TLS totals; main sums them: exactly N*M. The
 * contrast is the lesson — privacy is the cheapest synchronization.
 *
 * Build:  make tls
 * Run:    ./tls 4 1000000
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

static volatile long shared; /* racy, like race.c */
static __thread long mine;   /* one per thread: exact */
static long iters;

static void *worker(void *arg)
{
    (void)arg;
    mine = 0;
    for (long i = 0; i < iters; i++) {
        shared++;
        mine++;
    }
    return (void *)mine; /* harvest via join (§14.3) */
}

int main(int argc, char *argv[])
{
    long n = argc > 1 ? atol(argv[1]) : 4;
    iters = argc > 2 ? atol(argv[2]) : 1000000;
    if (n < 1 || n > 64 || iters < 1 || iters > 100000000) {
        fprintf(stderr, "usage: %s [threads] [iters]\n", argv[0]);
        return 1;
    }
    pthread_t *th = malloc((size_t)n * sizeof(pthread_t));
    if (!th) {
        perror("malloc");
        return 1;
    }
    for (long i = 0; i < n; i++)
        if (pthread_create(&th[i], NULL, worker, NULL) != 0) {
            perror("pthread_create");
            return 1;
        }
    long sum = 0;
    for (long i = 0; i < n; i++) {
        void *ret;
        pthread_join(th[i], &ret);
        sum += (long)ret;
    }
    long expect = n * iters;
    printf("shared: expected=%ld actual=%ld LOST=%ld\n", expect, shared,
           expect - shared);
    printf("tls-sum: expected=%ld actual=%ld (%s)\n", expect, sum,
           sum == expect ? "EXACT — privacy needs no lock" : "?!?!");
    free(th);
    return 0;
}
