/* maps.c — a pmap you can read in one sitting: /proc/PID/maps pretty-printed.
 *
 * Each VMA line becomes: address range, size, perms, class, path. Classes:
 * exe/lib/heap/stack/vdso/anon-mmap/file — the §10.6 floor plan. Totals:
 * VSZ (mapped) plus RSS from statm, so the VSZ-vs-RSS gap (§10.2) stares
 * back at you. Unreadable maps (another user's process) fail gracefully.
 *
 * Build:  make maps
 * Run:    ./maps self | head -30
 *         sleep 300 & ./maps $! | tail -8; kill %1
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void human(unsigned long bytes, char *out)
{
    const char *u[] = { "B", "K", "M", "G", "T" };
    double v = (double)bytes;
    int i = 0;
    while (v >= 1024.0 && i < 4) {
        v /= 1024.0;
        i++;
    }
    if (i == 0)
        sprintf(out, "%luB", bytes);
    else
        sprintf(out, "%.1f%s", v, u[i]);
}

/* Classify a mapping: the interesting question is always "WHOSE bytes?" */
static const char *classify(const char *path, const char *exe, const char *perms)
{
    if (!path[0])
        return strchr(perms, 'x') ? "anon-mmap(x)" : "anon-mmap";
    if (path[0] == '[')
        return path; /* [heap] [stack] [vdso] [vvar] already name themselves */
    const char *base = strrchr(path, '/');
    base = base ? base + 1 : path;
    if (exe[0] && strncmp(path, exe, strlen(exe)) == 0)
        return perms[0] == 'r' && perms[2] == 'x' ? "exe-text"
             : perms[1] == 'w'                     ? "exe-data"
                                                   : "exe-ro";
    if (strstr(base, "libc") == base || strstr(base, "ld-linux") == base)
        return "libc/loader";
    return "file-map";
}

int main(int argc, char *argv[])
{
    const char *who = argc > 1 ? argv[1] : "self";
    char mappath[64], exepath[64], statmpath[64];
    snprintf(mappath, sizeof(mappath), "/proc/%s/maps", who);
    snprintf(exepath, sizeof(exepath), "/proc/%s/exe", who);
    snprintf(statmpath, sizeof(statmpath), "/proc/%s/statm", who);

    FILE *f = fopen(mappath, "r");
    if (!f) {
        fprintf(stderr, "cannot read %s: ", mappath);
        perror("");
        fprintf(stderr, "(need same user — or root — to read another's map)\n");
        return 1;
    }
    char exe[256] = "";
    ssize_t n = readlink(exepath, exe, sizeof(exe) - 1);
    if (n > 0)
        exe[n] = '\0';

    printf("%-25s %8s %-5s %-12s %s\n", "RANGE", "SIZE", "PRM", "CLASS", "PATH");
    char line[512], sz[16];
    unsigned long long vsz = 0;
    long count = 0;
    while (fgets(line, sizeof(line), f)) {
        unsigned long lo, hi, off;
        char perms[5], path[256] = "";
        int pn = 0;
        if (sscanf(line, "%lx-%lx %4s %lx %*s %*s %n", &lo, &hi, perms,
                   &off, &pn) < 4)
            continue;
        if (line[pn] && line[pn] != '\n') {
            strncpy(path, line + pn, sizeof(path) - 1);
            path[strcspn(path, "\n")] = '\0';
            /* skip leading blanks before pathname */
            memmove(path, path + strspn(path, " \t"), strlen(path + strspn(path, " \t")) + 1);
        }
        human(hi - lo, sz);
        printf("%08lx-%08lx %8s %-5s %-12s %s\n", lo, hi, sz, perms,
               classify(path, exe, perms), path);
        vsz += hi - lo;
        count++;
    }
    fclose(f);

    /* RSS from statm (field 2, in pages) — the resident half of §10.2. */
    long rss_pages = -1;
    FILE *s = fopen(statmpath, "r");
    if (s) {
        if (fscanf(s, "%*d %ld", &rss_pages) != 1)
            rss_pages = -1;
        fclose(s);
    }
    char vs[16], rs[16];
    human(vsz, vs);
    if (rss_pages >= 0)
        human((unsigned long)rss_pages * (unsigned long)getpagesize(), rs);
    else
        snprintf(rs, sizeof(rs), "?");
    printf("---\nVMAs: %ld  VSZ (mapped): %s  RSS (resident): %s\n", count, vs, rs);
    return 0;
}
