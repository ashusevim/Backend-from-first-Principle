/* sigdemo.c — The flag pattern, race-free: handlers set flags, main acts.
 *
 * Handlers (SIGINT/SIGTERM/SIGUSR1) do exactly ONE thing: set a
 * `volatile sig_atomic_t`. Main blocks those signals normally and waits in
 * sigsuspend(), which ATOMICALLY unblocks + sleeps — closing the classic
 * check-then-sleep race (a signal landing between the flag check and pause()
 * would otherwise sleep forever). All printf()ing happens in main, where the
 * signals are blocked: no torn reads, no lost updates, no async-safety
 * issues at all.
 *
 * Build:  make sigdemo
 * Run:    ./sigdemo & S=$!; sleep 0.2
 *         kill -USR1 $S; sleep 0.2; kill -USR1 $S; sleep 0.2
 *         kill -INT $S; sleep 0.2; kill -TERM $S; wait $S
 */
#define _POSIX_C_SOURCE 200809L /* sigaction, sigsuspend */
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

/* Written by handlers, read by main. volatile: don't cache in a register
 * across the check; sig_atomic_t: single-instruction access, no torn reads. */
static volatile sig_atomic_t got_usr1 = 0;
static volatile sig_atomic_t got_int = 0;
static volatile sig_atomic_t got_term = 0;

static void on_usr1(int sig) { (void)sig; got_usr1++; }
static void on_int(int sig) { (void)sig; got_int = 1; }
static void on_term(int sig) { (void)sig; got_term = 1; }

static void install(int sig, void (*fn)(int))
{
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = fn;
    sigemptyset(&sa.sa_mask); /* don't block anything extra inside handler */
    sa.sa_flags = 0;
    if (sigaction(sig, &sa, NULL) != 0) {
        perror("sigaction");
        _exit(1);
    }
}

int main(void)
{
    install(SIGUSR1, on_usr1);
    install(SIGINT, on_int);
    install(SIGTERM, on_term);
    /* NOTE: SIGKILL/SIGSTOP deliberately absent — install() would fail
     * with EINVAL. The kernel enforces the kill switch (see README §2). */

    /* Block our three signals everywhere EXCEPT inside sigsuspend(). From
     * here on, handlers can only run while we're suspended — the flag
     * reads/writes below are race-free by construction. */
    sigset_t block, prev;
    sigemptyset(&block);
    sigaddset(&block, SIGUSR1);
    sigaddset(&block, SIGINT);
    sigaddset(&block, SIGTERM);
    sigprocmask(SIG_BLOCK, &block, &prev);

    printf("sigdemo pid=%d: send USR1/INT/TERM (TERM exits cleanly)\n",
           (int)getpid());
    fflush(stdout);

    while (!got_term) {
        sigsuspend(&prev); /* atomic: restore mask, sleep till a handler runs */
        if (got_usr1) {
            printf("main: got SIGUSR1 × %d (flag pattern: printf HERE, not in handler)\n",
                   (int)got_usr1);
            got_usr1 = 0;
            fflush(stdout);
        }
        if (got_int) {
            printf("main: got SIGINT (Ctrl-C sends this to the foreground group)\n");
            got_int = 0;
            fflush(stdout);
        }
        /* NOTE: plain pause() here would race (signal between check and
         * sleep = lost wakeup). sigsuspend() exists to close exactly that. */
    }
    printf("main: got SIGTERM — graceful exit 0\n");
    return 0;
}
