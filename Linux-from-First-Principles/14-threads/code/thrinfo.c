/* thrinfo.c — thread identity, measured: same pid, different tids/stacks.
 *
 * Main + N threads print: getpid (SAME for all — it's the TGID),
 * gettid (DIFFERENT — the kernel's real id), pthread_self, a stack
 * variable's address (different 8M regions: [stack:TID] in maps), and a
 * TLS variable's address (different per thread, §14.4). Optional 2nd arg:
 * seconds to HOLD (threads sleep — for experiment 01's live census).
 *
 * Build:  make thrinfo
 * Run:    ./thrinfo 4
 *         ./thrinfo 4 5 & sleep 0.5; ls /proc/$!/task; wait
 */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

static __thread int tls_var; /* one copy per thread (§14.4) */
static int hold_sec;

static void *worker(void *arg)
{
    long i = (long)arg;
    int stack_var = 0;
    tls_var = (int)i;
    /* Single printf per line: glibc's stdout lock keeps lines whole
     * (order across threads is free — scheduling decides). */
    printf("thread %ld: pid=%d tid=%d self=%lu stack=%p tls=%p\n", i,
           getpid(), gettid(), (unsigned long)pthread_self(),
           (void *)&stack_var, (void *)&tls_var);
    if (hold_sec > 0)
        sleep((unsigned)hold_sec);
    return NULL;
}

int main(int argc, char *argv[])
{
    long n = argc > 1 ? atol(argv[1]) : 4;
    if (argc > 2)
        hold_sec = atoi(argv[2]);
    if (n < 1 || n > 64 || hold_sec < 0 || hold_sec > 60) {
        fprintf(stderr, "usage: %s [threads 1..64] [hold-sec 0..60]\n",
                argv[0]);
        return 1;
    }
    int main_stack = 0;
    tls_var = -1;
    printf("main    : pid=%d tid=%d self=%lu stack=%p tls=%p\n", getpid(),
           gettid(), (unsigned long)pthread_self(), (void *)&main_stack,
           (void *)&tls_var);

    pthread_t *th = malloc((size_t)n * sizeof(pthread_t));
    if (!th) {
        perror("malloc");
        return 1;
    }
    for (long i = 0; i < n; i++)
        if (pthread_create(&th[i], NULL, worker, (void *)i) != 0) {
            perror("pthread_create");
            return 1;
        }
    for (long i = 0; i < n; i++)
        pthread_join(th[i], NULL);
    free(th);
    return 0;
}
