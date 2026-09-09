/* procself.c — Read your own task_struct (via /proc/self), field by field.
 *
 * Parses /proc/self/stat the way ps does — including the classic gotcha:
 * field 2 (comm) sits in parentheses and may itself contain spaces or even
 * ')', so you must scan to the LAST ')' on the line, not the first.
 *
 * Also resolves exe/cwd/root, and prints scheduler/identity context.
 *
 * Build:  make procself
 * Run:    ./procself
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <unistd.h>

static void show_link(const char *path, const char *label)
{
    char buf[512];
    ssize_t n = readlink(path, buf, sizeof(buf) - 1);
    if (n < 0) {
        printf("%-8s (unreadable)\n", label);
        return;
    }
    buf[n] = '\0';
    printf("%-8s %s\n", label, buf);
}

int main(void)
{
    /* --- Part 1: identity straight from syscalls --- */
    printf("=== identity (getpid/getppid/getpgid/getsid) ===\n");
    printf("pid=%d ppid=%d pgid=%d sid=%d threads? (see below)\n",
           (int)getpid(), (int)getppid(),
           (int)getpgid(0), (int)getsid(0));

    /* --- Part 2: /proc/self/stat, parsed like ps parses it --- */
    FILE *f = fopen("/proc/self/stat", "r");
    if (!f) {
        perror("fopen /proc/self/stat");
        return 1;
    }
    char *line = NULL;
    size_t cap = 0;
    if (getline(&line, &cap, f) < 0) {
        perror("getline");
        return 1;
    }
    fclose(f);

    /* Field 1 (pid) ends at the first space; field 2 (comm) runs to the
     * LAST ')' — comm itself may contain ')' (yes, really). */
    char *lparen = strchr(line, '(');
    char *rparen = strrchr(line, ')');
    if (!lparen || !rparen || rparen < lparen) {
        fprintf(stderr, "cannot parse comm\n");
        return 1;
    }
    *rparen = '\0';
    printf("\n=== /proc/self/stat ===\n");
    printf("pid        = %d\n", atoi(line));
    printf("comm       = \"%s\"\n", lparen + 1);

    /* Everything after ") " is plain whitespace-separated fields, starting
     * at field 3 (state). Tokenize a copy of the tail. */
    char *tail = rparen + 2; /* skip ") " */
    char *save = NULL;
    /* field 3 */ char *state = strtok_r(tail, " ", &save);
    /* field 4 */ char *ppid = strtok_r(NULL, " ", &save);
    strtok_r(NULL, " ", &save); /* 5 pgrp */
    strtok_r(NULL, " ", &save); /* 6 session */
    /* field 7 */ char *tty = strtok_r(NULL, " ", &save);
    for (int i = 8; i <= 13; i++)
        strtok_r(NULL, " ", &save); /* tpgid, flags, faults... */
    /* 14, 15 */ char *utime = strtok_r(NULL, " ", &save);
    char *stime = strtok_r(NULL, " ", &save);
    for (int i = 16; i <= 19; i++)
        strtok_r(NULL, " ", &save);
    /* field 20 */ char *threads = strtok_r(NULL, " ", &save);
    strtok_r(NULL, " ", &save); /* 21 itrealvalue (obsolete) */
    /* field 22 */ char *starttime = strtok_r(NULL, " ", &save);
    /* field 23, 24 */ char *vsize = strtok_r(NULL, " ", &save);
    char *rss = strtok_r(NULL, " ", &save);

    long hz = sysconf(_SC_CLK_TCK);
    long pg = sysconf(_SC_PAGESIZE);
    printf("state      = %s   (R unning / S leeping / D / T / Z ...)\n", state);
    printf("ppid       = %s\n", ppid);
    printf("tty_nr     = %s   (0 = no controlling terminal)\n", tty);
    printf("utime      = %s ticks (%.2f s user CPU)\n", utime, atoll(utime) / (double)hz);
    printf("stime      = %s ticks (%.2f s kernel CPU)\n", stime, atoll(stime) / (double)hz);
    printf("threads    = %s   (num_threads; /proc/self/task/ has this many entries)\n", threads);
    printf("starttime  = %s ticks after boot (ps lstart derives from this)\n", starttime);
    printf("vsize      = %s bytes (virtual size — §10)\n", vsize);
    printf("rss        = %s pages (%.1f MB resident — §10)\n",
           rss, atoll(rss) * pg / 1048576.0);

    /* --- Part 3: context symlinks --- */
    printf("\n=== context (readlink) ===\n");
    show_link("/proc/self/exe", "exe:");
    show_link("/proc/self/cwd", "cwd:");
    show_link("/proc/self/root", "root:");

    free(line);
    return 0;
}
