/* minish.c — A real (tiny) shell: fork + exec + wait, the Unix way.
 *
 * Features: external commands via PATH search (execvp), builtins (cd, exit),
 * foreground + background (&) jobs, exit-status/signal reporting, opportunistic
 * reaping of background jobs (no zombie buildup).
 * Deliberately missing (later sections): redirection (§08), pipes (§17),
 * job control (§07), quoting/expansion, scripting.
 *
 * Build:  make minish
 * Run:    ./minish                     # interactive (prompt on a tty)
 *         printf 'echo hi\nexit\n' | ./minish   # scripted (no prompt off-tty)
 */
#define _GNU_SOURCE /* getline, strsignal, WCOREDUMP */
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MAXARGS 64

/* Reap any finished background jobs without blocking. True shell behavior:
 * every prompt is a chance to collect the dead (else: zombies). */
static void reap_background(void)
{
    int status;
    pid_t p;
    while ((p = waitpid(-1, &status, WNOHANG)) > 0) {
        if (WIFEXITED(status))
            printf("[job %d done: exit %d]\n", (int)p, WEXITSTATUS(status));
        else if (WIFSIGNALED(status))
            printf("[job %d done: killed by signal %d (%s)]\n",
                   (int)p, WTERMSIG(status), strsignal(WTERMSIG(status)));
    }
}

/* Run argv[0..] in the foreground: fork, exec in the child, wait in us. */
static void run_foreground(char *argv[])
{
    pid_t c = fork();
    if (c < 0) {
        perror("minish: fork");
        return;
    }
    if (c == 0) {
        execvp(argv[0], argv); /* PATH search + exec; returns only on failure */
        fprintf(stderr, "minish: %s: %s\n", argv[0], strerror(errno));
        _exit(127); /* 127 = command not found (shell convention) */
    }

    /* Wait for THIS child (same pid throughout — never re-fork). A stop
     * (Ctrl-Z) resumes via SIGCONT: minish v1 has no job control, so a
     * stopped job is resumed, not tabled. (§07 builds the real thing.) */
    int status;
    for (;;) {
        pid_t p;
        do { /* EINTR retry: a signal may interrupt the wait (§07) */
            p = waitpid(c, &status, WUNTRACED);
        } while (p < 0 && errno == EINTR);
        if (p < 0) {
            perror("minish: waitpid"); /* unreachable: c is our live child */
            return;
        }
        if (!WIFSTOPPED(status))
            break;
        printf("[stopped by signal %d — no job control, resuming]\n",
               WSTOPSIG(status));
        kill(c, SIGCONT);
    }

    if (WIFEXITED(status)) {
        if (WEXITSTATUS(status) != 0) /* silence on success, like real shells */
            printf("[exit %d]\n", WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("[killed by signal %d (%s)%s]\n", WTERMSIG(status),
               strsignal(WTERMSIG(status)),
               WCOREDUMP(status) ? " (core dumped)" : "");
    }
}

static void run_background(char *argv[])
{
    pid_t c = fork();
    if (c < 0) {
        perror("minish: fork");
        return;
    }
    if (c == 0) {
        execvp(argv[0], argv);
        fprintf(stderr, "minish: %s: %s\n", argv[0], strerror(errno));
        _exit(127);
    }
    printf("[started job %d]\n", (int)c);
}

int main(void)
{
    /* A shell's own messages (prompt, job notices) must never sit in a
     * buffer — unbuffer stdout so they appear the moment they're printed. */
    setvbuf(stdout, NULL, _IONBF, 0);
    char *line = NULL;
    size_t cap = 0;
    int interactive = isatty(STDIN_FILENO);

    for (;;) {
        reap_background(); /* collect yesterday's & jobs before each prompt */
        if (interactive) {
            printf("minish$ ");
            fflush(stdout);
        }
        if (getline(&line, &cap, stdin) < 0) { /* EOF: Ctrl-D / end of pipe */
            if (interactive)
                printf("\n");
            break;
        }

        /* Tokenize on whitespace. (No quoting in v1 — §17's parser grows up.) */
        char *argv[MAXARGS + 1];
        int n = 0;
        char *save = NULL;
        for (char *tok = strtok_r(line, " \t\r\n", &save);
             tok && n < MAXARGS; tok = strtok_r(NULL, " \t\r\n", &save))
            argv[n++] = tok;
        argv[n] = NULL;
        if (n == 0)
            continue;

        /* Trailing & => background. */
        int bg = 0;
        if (strcmp(argv[n - 1], "&") == 0) {
            bg = 1;
            argv[--n] = NULL;
            if (n == 0)
                continue;
        }

        /* Builtins: must run in US (a child can't cd its parent — §01). */
        if (strcmp(argv[0], "exit") == 0)
            break;
        if (strcmp(argv[0], "cd") == 0) {
            const char *dir = n > 1 ? argv[1] : getenv("HOME");
            if (!dir)
                dir = "/";
            if (chdir(dir) != 0)
                perror("minish: cd");
            continue;
        }

        if (bg)
            run_background(argv);
        else
            run_foreground(argv);
    }

    free(line);
    reap_background(); /* one last collection (best effort, non-blocking) */
    return 0;
}
