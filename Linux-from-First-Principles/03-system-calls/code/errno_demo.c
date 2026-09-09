/* errno_demo.c — Fail an open() and read the error at every layer.
 *
 * Layer 1 (kernel):  returns -ENOENT (-2) in rax. Full stop.
 * Layer 2 (libc):    EVERY libc function — open() AND syscall() alike —
 *                    translates: errno = 2, return -1.
 * Layer 3 (you):     perror()/strerror() turn 2 into words.
 * True raw access:   only hand-written `syscall` instructions (below, and
 *                    hello_asm.s) ever see the kernel's -2 directly.
 *
 * Build:  make errno_demo
 * Run:    ./errno_demo
 */
#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/syscall.h>
#include <unistd.h>

/* Issue openat() with a hand-written `syscall`: no libc translation —
 * the kernel's return value (here: -ENOENT) comes back untouched. */
static long raw_openat(const char *path)
{
    long ret;
    register long r10 __asm__("r10") = 0; /* mode: unused for O_RDONLY */
    __asm__ volatile("syscall"
                     : "=a"(ret)
                     : "a"((long)SYS_openat), "D"((long)AT_FDCWD),
                       "S"(path), "d"((long)O_RDONLY), "r"(r10)
                     : "rcx", "r11", "memory");
    return ret;
}

int main(void)
{
    const char *missing = "/no/such/file/ever";

    /* --- The libc path: open() wrapper --- */
    errno = 0;
    int fd = open(missing, O_RDONLY);
    printf("open() wrapper   -> returned %d, errno=%d (%s)\n",
           fd, errno, strerror(errno));
    perror("open() via perror");

    /* --- syscall() is libc too: same translation! --- */
    errno = 0;
    long via_gate = syscall(SYS_openat, AT_FDCWD, missing, O_RDONLY, 0);
    printf("syscall() gate   -> returned %ld, errno=%d (still translated!)\n",
           via_gate, errno);

    /* --- The true raw value, via inline asm --- */
    errno = 0;
    long raw = raw_openat(missing);
    printf("raw `syscall`    -> returned %ld (== -ENOENT, errno still %d)\n",
           raw, errno);
    printf("(ENOENT is %d; see /usr/include/asm-generic/errno-base.h)\n", ENOENT);
    return 0;
}
