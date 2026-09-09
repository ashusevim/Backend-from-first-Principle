/* hello_libc.c — Hello world, the normal way (for trace comparison).
 *
 * printf() buffers in user space, then the libc write() wrapper issues
 * syscall #1. Before main() even runs, the loader + libc init perform
 * ~30 syscalls of their own — count them in experiment 01.
 *
 * Build:  make hello_libc
 * Run:    ./hello_libc
 */
#include <stdio.h>

int main(void)
{
    printf("hello from libc\n");
    return 0;
}
