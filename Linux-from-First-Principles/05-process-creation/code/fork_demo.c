/* fork_demo.c — One call, two returns.
 *
 * fork() duplicates the process: same code resumes in both, distinguished
 * only by the return value (child's PID to the parent, 0 to the child).
 * The variable x proves the memory was copied (CoW, §11): each side's
 * increment is invisible to the other.
 *
 * Build:  make fork_demo
 * Run:    ./fork_demo
 */
#include <stdio.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void)
{
    int x = 42;
    printf("parent: pid=%d, about to fork (x=%d)\n", (int)getpid(), x);
    fflush(stdout); /* fork copies the stdio BUFFER too — flush first, else
                       the child re-prints (or loses) our pending output */

    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    if (c == 0) {
        /* --- child: same code, same x (a COPY), new pid --- */
        x += 1;
        printf("child : pid=%d ppid=%d, x=%d (my own copy)\n",
               (int)getpid(), (int)getppid(), x);
        fflush(stdout); /* explicit flush... */
        _exit(0);       /* ...then _exit (exit() would flush inherited buffers twice) */
    }

    /* --- parent: fork returned the child's pid --- */
    x += 100;
    printf("parent: child is %d, my x=%d (untouched by child)\n", (int)c, x);

    int status;
    pid_t p = waitpid(c, &status, 0); /* reap — else the child zombifies */
    printf("parent: reaped %d, exit status %d\n",
           (int)p, WIFEXITED(status) ? WEXITSTATUS(status) : -1);
    return 0;
}
