/* forkshare.c — fork() shares offsets: parent+child interleave, byte-perfect.
 *
 * Opens ONE file, forks, and parent+child alternately write() their own
 * letters through the SAME description. Because the offset is shared and the
 * kernel advances it atomically per write, the bytes interleave cleanly
 * (order varies with scheduling; corruption never happens).
 * Contrast: two separate open()s would both start at 0 and overwrite.
 *
 * Build:  make forkshare
 * Run:    ./forkshare
 */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void)
{
    char path[] = "/tmp/forkshare-XXXXXX";
    int fd = mkstemp(path);
    if (fd < 0) {
        perror("mkstemp");
        return 1;
    }

    /* Alternate strictly: parent writes P, signals via pipe... too complex?
     * Simpler: each writes 8 small chunks; scheduling interleaves them.
     * Shared offset => every byte lands exactly once, in SOME order. */
    fflush(stdout);
    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    const char *mine = (c == 0) ? "cccccccc" : "PPPPPPPP";
    for (int i = 0; i < 8; i++) {
        if (write(fd, &mine[i], 1) != 1) {
            perror("write");
            _exit(1);
        }
        usleep(1000); /* widen the race window so interleaving shows */
    }
    if (c == 0) {
        _exit(0);
    }
    waitpid(c, NULL, 0);

    /* Read back the whole file through the same fd (seek to 0 first). */
    lseek(fd, 0, SEEK_SET);
    char out[17];
    ssize_t n = read(fd, out, 16);
    out[n < 0 ? 0 : n] = '\0';
    int ps = 0, cs = 0;
    for (ssize_t i = 0; i < n; i++) {
        ps += (out[i] == 'P');
        cs += (out[i] == 'c');
    }
    printf("file (%zd bytes): %s\n", n, out);
    printf("P=%d c=%d (all 16 bytes present exactly once — shared offset, no clobbering)\n",
           ps, cs);
    close(fd);
    unlink(path);
    return (n == 16 && ps == 8 && cs == 8) ? 0 : 1;
}
