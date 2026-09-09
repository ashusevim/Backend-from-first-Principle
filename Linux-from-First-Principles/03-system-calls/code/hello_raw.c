/* hello_raw.c — Hello world via the generic syscall() gate.
 *
 * No write()/exit() wrappers: we name the syscall numbers ourselves and let
 * libc's syscall() marshal number+args into rax/rdi/rsi/rdx and execute
 * `syscall`. Note: syscall() is still a libc function — on error it returns
 * -1 and sets errno like any wrapper. Only hand-written asm (hello_asm.s,
 * errno_demo.c) sees the kernel's raw -ERRNO.
 *
 * Build:  make hello_raw
 * Run:    ./hello_raw; echo "exit code: $?"
 */
#define _GNU_SOURCE
#include <sys/syscall.h>
#include <unistd.h>

int main(void)
{
    const char msg[] = "hello from raw syscall()\n";
    long n = syscall(SYS_write, STDOUT_FILENO, msg, sizeof(msg) - 1);
    if (n < 0)
        syscall(SYS_exit, 1); /* failed; kernel gave us -ERRNO in n */
    syscall(SYS_exit, 0);     /* never returns */
    return 0;                 /* unreachable, keeps -Wall happy */
}
