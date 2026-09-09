/* redirect.c — Shell redirection by hand: `cmd > redirect-out.txt`.
 *
 * fork(); in the child: open file, dup2 onto fd 1, close original, exec.
 * The executed program writes stdout and lands in the file, none the wiser.
 * Exit status/signal of the child is reported (minish §05 discipline).
 *
 * Build:  make redirect
 * Run:    ./redirect /bin/echo hello-fd
 *         cat redirect-out.txt            # hello-fd
 */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "usage: %s program [args...]  (> redirect-out.txt)\n", argv[0]);
        return 1;
    }
    const char *outfile = "redirect-out.txt";

    fflush(stdout);
    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    if (c == 0) {
        /* --- child: become `argv[1..] > redirect-out.txt` --- */
        int fd = open(outfile, O_WRONLY | O_CREAT | O_TRUNC, 0644);
        if (fd < 0) {
            fprintf(stderr, "redirect: open %s: %s\n", outfile, strerror(errno));
            _exit(1);
        }
        if (dup2(fd, STDOUT_FILENO) < 0) { /* fd 1 := alias of the file */
            fprintf(stderr, "redirect: dup2: %s\n", strerror(errno));
            _exit(1);
        }
        close(fd); /* alias (fd 1) keeps the description alive */
        execvp(argv[1], &argv[1]);
        fprintf(stderr, "redirect: exec %s: %s\n", argv[1], strerror(errno));
        _exit(127);
    }

    int status;
    while (waitpid(c, &status, 0) < 0 && errno == EINTR)
        ;
    if (WIFEXITED(status))
        printf("child exited %d; output captured in %s\n",
               WEXITSTATUS(status), outfile);
    else if (WIFSIGNALED(status))
        printf("child killed by signal %d\n", WTERMSIG(status));
    return 0;
}
