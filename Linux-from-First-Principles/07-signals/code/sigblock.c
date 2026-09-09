/* sigblock.c — Block signals, watch them pile in SigPnd, then deliver.
 *
 * Blocks SIGINT+SIGTERM for N seconds (handlers installed but masked), shows
 * SigPnd from /proc/self/status (proof they're waiting, merged, harmless),
 * then unblocks: both handlers fire immediately. The mask/pending/delivery
 * cycle, made visible.
 *
 * Build:  make sigblock
 * Run:    ./sigblock 8 & S=$!; sleep 1
 *         kill -INT $S; kill -INT $S; kill -TERM $S   # pile up while blocked
 *         wait $S                                    # unblock: INT,INT->1,TERM fire
 */
#define _POSIX_C_SOURCE 200809L
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void on_int(int sig)
{
    /* write() is async-signal-safe; printf is NOT — this line is legal. */
    const char m[] = "handler: SIGINT delivered (after unblock)\n";
    (void)sig;
    (void)write(STDOUT_FILENO, m, sizeof(m) - 1);
}

static void on_term(int sig)
{
    const char m[] = "handler: SIGTERM delivered (after unblock)\n";
    (void)sig;
    (void)write(STDOUT_FILENO, m, sizeof(m) - 1);
}

static void install(int sig, void (*fn)(int))
{
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = fn;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(sig, &sa, NULL);
}

static void show_masks(const char *when)
{
    FILE *f = fopen("/proc/self/status", "r");
    char *line = NULL;
    size_t cap = 0;
    printf("--- %s ---\n", when);
    while (getline(&line, &cap, f) > 0)
        if (strncmp(line, "SigPnd:", 7) == 0 || strncmp(line, "ShdPnd:", 7) == 0 ||
            strncmp(line, "SigBlk:", 7) == 0)
            printf("%s", line);
    /* kill() sends PROCESS-directed signals: while blocked they wait in the
     * SHARED queue (ShdPnd). Thread-directed ones (pthread_kill) wait in the
     * thread's own SigPnd. Delivery drains from either. */
    fclose(f);
    free(line);
}

int main(int argc, char *argv[])
{
    int window = argc > 1 ? atoi(argv[1]) : 8;
    if (window <= 0)
        window = 8;

    install(SIGINT, on_int);
    install(SIGTERM, on_term);

    sigset_t block;
    sigemptyset(&block);
    sigaddset(&block, SIGINT);
    sigaddset(&block, SIGTERM);
    sigprocmask(SIG_BLOCK, &block, NULL);

    printf("sigblock pid=%d: INT+TERM blocked for %ds — kill me now!\n",
           (int)getpid(), window);
    show_masks("blocked, nothing sent yet");
    fflush(stdout);

    for (int i = 0; i < window; i++) {
        /* sleep() can't be cut short by INT/TERM here — they're blocked
         * (only an UNBLOCKED handled signal interrupts a slow call). */
        sleep(1);
        if (i == window / 2)
            show_masks("mid-window (send signals NOW if you haven't)");
    }

    show_masks("unblocking now");
    printf("unblocking — pending handlers fire immediately:\n");
    fflush(stdout);
    sigprocmask(SIG_UNBLOCK, &block, NULL);
    sleep(1); /* let the writes land before exit */
    show_masks("after delivery (SigPnd drained)");
    return 0;
}
