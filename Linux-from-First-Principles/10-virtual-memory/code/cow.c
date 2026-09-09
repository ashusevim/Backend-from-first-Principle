/* cow.c — fork() without copying, PROVED via the shared/private split.
 *
 * RSS canNOT show CoW: it counts shared frames too, so swapping a shared
 * frame for a private copy leaves RSS unchanged. The real witnesses are in
 * smaps_rollup (per-PTE accounting): at fork, the parent's Private pages
 * become the child's Shared pages; as the child writes, Shared drains back
 * into Private. PSS (proportional share) also rises: shared/2 -> owned.
 *
 * Parent mallocs N MiB and dirties it. Watch Shr/Priv/PSS across fork+write.
 *
 * Build:  make cow
 * Run:    ./cow 100
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

/* Shared/Private/PSS from smaps_rollup (per-PTE truth) + RSS from statm. */
static void mem(const char *who, const char *when)
{
    long shared = -1, priv = -1, pss = -1, rss = -1;
    FILE *f = fopen("/proc/self/smaps_rollup", "r");
    if (f) {
        char key[64];
        long kb;
        long sh_c = 0, sh_d = 0, pr_c = 0, pr_d = 0;
        char line[128];
        while (fgets(line, sizeof(line), f)) {
            if (sscanf(line, "%63[^:]: %ld", key, &kb) != 2)
                continue;
            if (strcmp(key, "Shared_Clean") == 0)
                sh_c = kb;
            else if (strcmp(key, "Shared_Dirty") == 0)
                sh_d = kb;
            else if (strcmp(key, "Private_Clean") == 0)
                pr_c = kb;
            else if (strcmp(key, "Private_Dirty") == 0)
                pr_d = kb;
            else if (strcmp(key, "Pss") == 0)
                pss = kb;
        }
        fclose(f);
        shared = sh_c + sh_d;
        priv = pr_c + pr_d;
    }
    f = fopen("/proc/self/statm", "r");
    if (f) {
        long pages;
        if (fscanf(f, "%*d %ld", &pages) == 1)
            rss = pages * getpagesize() / 1024;
        fclose(f);
    }
    printf("%-6s %-22s RSS=%6ldK Shr=%6ldK Priv=%6ldK Pss=%6ldK\n", who, when,
           rss, shared, priv, pss);
}

int main(int argc, char *argv[])
{
    long mb = argc > 1 ? atol(argv[1]) : 100;
    if (mb <= 0 || mb > 2048) {
        fprintf(stderr, "usage: %s [MiB, 1..2048]\n", argv[0]);
        return 1;
    }
    size_t len = (size_t)mb * 1024 * 1024;
    /* N MiB >> MMAP_THRESHOLD, so glibc mmaps this (anonymous, private,
     * CoW-able) instead of growing the brk heap — §11 tells that story. */
    unsigned char *p = malloc(len);
    if (!p) {
        perror("malloc");
        return 1;
    }
    memset(p, 0xAA, len); /* dirty every page: genuinely resident now */

    mem("parent", "holding N MiB:");
    printf("  (predict: fork moves Priv->Shr in the child; writes move it back)\n");
    fflush(stdout); /* forkshare lesson (§08): no duplicated buffers */

    pid_t c = fork();
    if (c < 0) {
        perror("fork");
        return 1;
    }
    if (c == 0) { /* child */
        mem("child", "just forked:");
        memset(p, 0xBB, len); /* write all: CoW-copy every page */
        /* Checksum: without an observable read, -O2 deletes the memset as
         * dead stores — no writes, no CoW, a very confusing demo. */
        volatile unsigned char sink = 0;
        for (size_t i = 0; i < len; i += 4096)
            sink += p[i];
        mem("child", "after writing all:");
        printf("  (checksum %u — the writes really happened)\n", sink);
        fflush(stdout); /* _exit never flushes */
        _exit(0);
    }
    int st;
    waitpid(c, &st, 0);
    mem("parent", "child done:");
    free(p);
    return 0;
}
