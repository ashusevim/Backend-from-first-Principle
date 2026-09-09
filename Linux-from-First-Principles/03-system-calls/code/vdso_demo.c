/* vdso_demo.c — One real syscall and one vDSO call, side by side.
 *
 * getpid() crosses into the kernel (appears in traces).
 * clock_gettime() is served by the vDSO in user space (invisible to traces).
 * Trace this program and diff: the missing call is the lesson.
 *
 * Build:  make vdso_demo
 * Run:    ./vdso_demo
 *         ./mini-strace ./vdso_demo     # getpid present, clock_gettime absent
 *         strace -e trace=%process,%clock ./vdso_demo   # same, with real strace
 */
#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

int main(void)
{
    struct timespec ts;

    pid_t p = getpid(); /* real syscall (__NR_getpid = 39) */
    clock_gettime(CLOCK_REALTIME, &ts); /* vDSO: no crossing */

    printf("pid=%d time=%ld.%09ld\n", (int)p, (long)ts.tv_sec, (long)ts.tv_nsec);
    return 0;
}
