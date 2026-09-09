/* zombie.c — Make a zombie on purpose, observe it, then reap it.
 *
 * The child exits immediately with status 42; the parent sleeps WITHOUT
 * waiting, so the child lingers as Z (defunct): PID slot + exit code, no
 * memory, no fds. Then the parent reaps and prints the collected status.
 *
 * Build:  make zombie
 * Run:    ./zombie 10 &            # 10s of zombie-hood
 *         ps -o pid,ppid,stat,cmd  # spot the Z / <defunct>
 *         wait                     # let the parent reap (status 42)
 */
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    int nap = argc > 1 ? atoi(argv[1]) : 15;
    if (nap < 0)
        nap = 15;

    fflush(stdout); /* fork copies stdio buffers — flush so the child starts clean */
    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    if (c == 0) {
        printf("child %d: exiting with status 42 (parent won't reap for %ds)\n",
               (int)getpid(), nap);
        fflush(stdout);
        _exit(42); /* _exit: no inherited-buffer double flush (see fork_demo) */
    }

    printf("parent %d: child is %d — run `ps` now to see it Z/defunct\n",
           (int)getpid(), (int)c);
    sleep((unsigned)nap); /* child is a zombie for this whole window */

    int status;
    pid_t p = waitpid(c, &status, 0);
    printf("parent: reaped %d, WIFEXITED=%d status=%d (zombie gone)\n",
           (int)p, !!WIFEXITED(status), WEXITSTATUS(status));
    return 0;
}
