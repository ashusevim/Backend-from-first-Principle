/* orphan.c — Die as a parent; watch the child get adopted.
 *
 * The parent forks and exits immediately. The child sleeps, then reports
 * its (new) parent: the kernel reparented it to the nearest subreaper or
 * PID 1, which will reap it on sight — orphans can never zombify.
 *
 * Build:  make orphan
 * Run:    ./orphan              # then: ps -o pid,ppid,cmd to see the adoption
 *         setsid ./orphan       # adoption target may differ (exercise 5)
 */
#include <stdio.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void)
{
    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    if (c == 0) {
        /* --- child: outlive the parent --- */
        printf("child %d: my parent is %d; sleeping 5s while it exits...\n",
               (int)getpid(), (int)getppid());
        fflush(stdout); /* _exit() never flushes — do it by hand, every time */
        sleep(5);
        printf("child %d: my parent is NOW %d (reparented!)\n",
               (int)getpid(), (int)getppid());
        fflush(stdout);
        _exit(0); /* reaped instantly by the adopter — no zombie possible */
    }

    /* --- parent: exit at once, abandoning the child --- */
    printf("parent %d: child is %d; exiting immediately.\n", (int)getpid(), (int)c);
    fflush(stdout);
    _exit(0); /* NOTE: _exit, and NO waitpid — that absence is the experiment */
}
