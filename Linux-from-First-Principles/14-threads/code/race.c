/* race.c — the disease, untreated: N threads x M racy increments.
 *
 * counter++ is load-add-store; interleavings overwrite each other and
 * updates VANISH. Expected N*M; measured: less, differently every run.
 * `volatile` forces every increment through memory (widest race window) —
 * it is a DEMO crutch, NOT a fix (the fix is §15: mutexes/atomics).
 *
 * Build:  make race
 * Run:    ./race 4 1000000
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>

static volatile long counter; /* shared, unguarded: the bug */
static long iters;

static void *worker(void *arg)
{
    (void)arg;
    for (long i = 0; i < iters; i++)
        counter++; /* load-add-store: 3 insns, 0 protection */
    return NULL;
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
    for (long i = 0; i < n; i++)
        pthread_join(th[i], NULL);
    long expect = n * iters;
    printf("threads=%ld iters=%ld expected=%ld actual=%ld LOST=%ld\n", n,
           iters, expect, counter, expect - counter);
    free(th);
    return 0;
}
