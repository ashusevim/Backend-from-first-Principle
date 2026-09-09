/* fault.c — Catch your own SIGSEGV, print it, and exit WITHOUT returning.
 *
 * A synchronous signal (thrown by your own faulting instruction): returning
 * from the handler would re-execute the fault → infinite SIGSEGV loop. So
 * the handler _exit()s with the shell-convention code 128+11 = 139.
 *
 * Build:  make fault
 * Run:    ./fault; echo "exit: $?"
 */
#define _POSIX_C_SOURCE 200809L
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static void on_segv(int sig)
{
    const char m[] = "handler: caught SIGSEGV (my own fault!) — _exit(139), NOT returning\n";
    (void)sig;
    (void)write(STDOUT_FILENO, m, sizeof(m) - 1);
    _exit(128 + 11); /* 139: the code shells report for "died of SIGSEGV" */
}

int main(void)
{
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = on_segv;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGSEGV, &sa, NULL);

    printf("fault pid=%d: about to write through NULL...\n", (int)getpid());
    fflush(stdout);

    *(volatile int *)0 = 42; /* the fault: CPU trap → kernel → SIGSEGV to us */

    printf("UNREACHABLE: if you see this, the handler returned (it must not)\n");
    return 0;
}
