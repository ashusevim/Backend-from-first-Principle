/* fdchain.c — One file, three handles: prove the sharing matrix.
 *
 * Opens the same file TWICE (two descriptions, independent offsets) plus a
 * dup() of the first (same description, shared offset). Reads + seeks on
 * each, printing offsets via lseek(SEEK_CUR) — the numbers ARE the lesson:
 *   open+open: independent.  dup: joined at the hip.
 *
 * Build:  make fdchain
 * Run:    ./fdchain
 */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static long off(int fd) { return (long)lseek(fd, 0, SEEK_CUR); }

int main(void)
{
    char path[] = "/tmp/fdchain-XXXXXX";
    int tmp = mkstemp(path);
    if (tmp < 0) {
        perror("mkstemp");
        return 1;
    }
    const char *data = "0123456789ABCDEF";
    if (write(tmp, data, strlen(data)) != (ssize_t)strlen(data)) {
        perror("write");
        return 1;
    }
    close(tmp);

    int a = open(path, O_RDONLY);          /* description #1 */
    int b = open(path, O_RDONLY);          /* description #2 (independent!) */
    int c = dup(a);                        /* alias of #1 (shared!) */
    if (a < 0 || b < 0 || c < 0) {
        perror("open/dup");
        return 1;
    }
    printf("fds: a=%d b=%d c=dup(a)=%d  (lowest-free-number allocation!)\n", a, b, c);
    printf("start offsets: a=%ld b=%ld c=%ld\n", off(a), off(b), off(c));

    char buf[5];
    ssize_t n = read(a, buf, 4);           /* description #1: 0 -> 4 */
    printf("read(a,4)=%zd bytes; offsets now: a=%ld b=%ld c=%ld\n",
           n, off(a), off(b), off(c));
    printf("  -> c moved WITH a (shared description); b didn't (own description)\n");

    lseek(c, 10, SEEK_SET);                /* seek via the ALIAS */
    printf("lseek(c,10): offsets now: a=%ld b=%ld c=%ld\n", off(a), off(b), off(c));
    printf("  -> a moved too (ONE offset for a+c); b still independent\n");

    n = read(b, buf, 4);                   /* description #2, still at 0 */
    buf[n] = '\0';
    printf("read(b,4)=\"%s\" (b reads from ITS offset 0, undisturbed)\n", buf);

    /* External cross-check: the kernel agrees (fdinfo shows the offsets). */
    printf("--- kernel's view (/proc/self/fdinfo) ---\n");
    fflush(stdout); /* system() writes straight to the fd: flush first or
                       its output jumps ahead of our buffered lines */
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "grep -H . /proc/self/fdinfo/%d /proc/self/fdinfo/%d | grep pos:", a, b);
    if (system(cmd) != 0)
        printf("(fdinfo unreadable — continuing)\n");

    close(a);
    close(b);
    close(c);
    unlink(path);
    return 0;
}
