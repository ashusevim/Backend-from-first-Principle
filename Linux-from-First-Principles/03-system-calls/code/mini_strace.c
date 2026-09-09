/* mini_strace.c — A ~180-line syscall tracer built on ptrace().
 *
 * The same primitive strace/gdb use: the child marks itself TRACEME, the
 * parent wakes at every syscall entry AND exit, reading the number from
 * orig_rax and the result from rax.
 *
 * Two subtleties, both handled below (all verified empirically — see the
 * commit history for the probe that nailed the exact stop sequence):
 *  1. The child raises SIGSTOP before exec so the parent can install
 *     options FIRST. Without this handshake, the exec runs before tracing
 *     starts and its entry stop is lost.
 *  2. A successful execve produces THREE stops, in this order: the entry
 *     stop (old image, real args), the PTRACE_EVENT_EXEC event stop
 *     (needs PTRACE_O_TRACEEXEC), and the exit stop — which arrives with
 *     the NEW image's registers already installed (zeroed) and rax = 0.
 * A FAILED execve is ordinary: entry stop, exit stop with -ENOENT, and the
 * child goes on to report the error — all visible in the trace.
 *
 * This traces the syscall *boundary* (numbers + raw args + return values).
 * Real strace additionally decodes strings/structs/flags — exercise 5 in the
 * section README starts you down that path.
 *
 * Build:  make mini-strace
 * Run:    ./mini-strace ./hello_asm
 *         ./mini-strace /bin/true
 *         ./mini-strace /no/such/program   # watch the failed execve
 */
#define _GNU_SOURCE
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/ptrace.h>
#include <sys/user.h> /* struct user_regs_struct */
#include <sys/wait.h>
#include <unistd.h>

/* x86-64 numbers we name; anything else prints as sys_<nr>. Full list:
 * /usr/include/x86_64-linux-gnu/asm/unistd_64.h */
static const char *sysname(long nr)
{
    switch (nr) {
    case 0: return "read"; case 1: return "write"; case 2: return "open";
    case 3: return "close"; case 4: return "stat"; case 5: return "fstat";
    case 8: return "lseek"; case 9: return "mmap"; case 10: return "mprotect";
    case 11: return "munmap"; case 12: return "brk"; case 13: return "rt_sigaction";
    case 14: return "rt_sigprocmask"; case 15: return "rt_sigreturn";
    case 16: return "ioctl"; case 17: return "pread64";
    case 19: return "readv"; case 20: return "writev";
    case 21: return "access"; case 22: return "pipe"; case 32: return "dup";
    case 33: return "dup2"; case 35: return "nanosleep";
    case 39: return "getpid"; case 59: return "execve";
    case 57: return "fork"; case 56: return "clone"; case 60: return "exit";
    case 61: return "wait4"; case 63: return "uname"; case 72: return "fcntl";
    case 79: return "getcwd"; case 102: return "getuid"; case 104: return "getgid";
    case 107: return "geteuid"; case 108: return "getegid";
    case 158: return "arch_prctl"; case 202: return "futex";
    case 217: return "getdents64"; case 218: return "set_tid_address";
    case 228: return "clock_gettime"; case 231: return "exit_group";
    case 232: return "epoll_wait"; case 233: return "epoll_ctl";
    case 257: return "openat"; case 262: return "newfstatat";
    case 268: return "statx"; case 273: return "set_robust_list";
    case 302: return "prlimit64"; case 334: return "rseq";
    default: break;
    }
    static char buf[32];
    snprintf(buf, sizeof(buf), "sys_%ld", nr);
    return buf;
}

static void trace_child(char *const argv[])
{
    if (ptrace(PTRACE_TRACEME, 0, 0, 0) != 0) {
        perror("PTRACE_TRACEME");
        _exit(1);
    }
    /* Stop here so the parent installs options BEFORE we exec. SIGSTOP can
     * neither be missed nor ignored — the handshake has no race. */
    raise(SIGSTOP);
    execvp(argv[0], argv); /* only returns on failure */
    perror("execvp");
    _exit(127);
}

static void print_entry(pid_t child)
{
    struct user_regs_struct regs;
    if (ptrace(PTRACE_GETREGS, child, 0, &regs) != 0) {
        perror("PTRACE_GETREGS");
        return;
    }
    printf("%s(0x%llx, 0x%llx, 0x%llx) ... ",
           sysname((long)regs.orig_rax), regs.rdi, regs.rsi, regs.rdx);
    fflush(stdout);
}

static void print_exit(pid_t child)
{
    struct user_regs_struct regs;
    if (ptrace(PTRACE_GETREGS, child, 0, &regs) != 0) {
        perror("PTRACE_GETREGS");
        return;
    }
    printf("= %lld\n", (long long)regs.rax);
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "usage: %s program [args...]\n", argv[0]);
        return 1;
    }

    pid_t child = fork();
    if (child < 0) {
        perror("fork");
        return 1;
    }
    if (child == 0)
        trace_child(argv + 1);

    /* Catch the child's pre-exec SIGSTOP, then arm tracing. */
    int status;
    waitpid(child, &status, 0);
    if (!WIFSTOPPED(status)) {
        fprintf(stderr, "child died before tracing began\n");
        return 1;
    }
    ptrace(PTRACE_SETOPTIONS, child, 0,
           PTRACE_O_TRACESYSGOOD | PTRACE_O_TRACEEXEC);

    int entering = 1; /* stops alternate entry, exit, entry, exit... */
    for (;;) {
        if (ptrace(PTRACE_SYSCALL, child, 0, 0) != 0) {
            perror("PTRACE_SYSCALL");
            return 1;
        }
        waitpid(child, &status, 0);
        if (WIFEXITED(status)) {
            printf("+++ exited with %d +++\n", WEXITSTATUS(status));
            return 0;
        }
        if (WIFSIGNALED(status)) {
            printf("+++ killed by signal %d +++\n", WTERMSIG(status));
            return 0;
        }
        if (!WIFSTOPPED(status))
            continue;
        int sig = WSTOPSIG(status);
        if (sig == SIGTRAP && (status >> 16) == PTRACE_EVENT_EXEC) {
            /* Successful exec, midpoint: the exit stop still comes next
             * (with the new image's registers), so leave entering = 0. */
            printf("\n>>> exec event: image replaced <<<\n");
            fflush(stdout);
            continue;
        }
        if (sig != (SIGTRAP | 0x80)) {
            /* A genuine signal: report it, deliver it, keep tracing. */
            printf("--- signal %d ---\n", sig);
            ptrace(PTRACE_SYSCALL, child, 0, sig);
            waitpid(child, &status, 0);
            if (WIFEXITED(status)) {
                printf("+++ exited with %d +++\n", WEXITSTATUS(status));
                return 0;
            }
            if (WIFSIGNALED(status)) {
                printf("+++ killed by signal %d +++\n", WTERMSIG(status));
                return 0;
            }
            continue;
        }
        if (entering)
            print_entry(child);
        else
            print_exit(child);
        entering = !entering;
    }
}
