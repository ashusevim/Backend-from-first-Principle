/* ppid_chain.c — Walk your own ancestry to PID 1 via /proc.
 *
 * Starts at getpid(), reads /proc/<pid>/stat for (comm, ppid), prints the
 * link, then climbs to the parent. What you see is your process's lineage:
 * you -> shell -> terminal/sshd/... -> init. Orphans (§05) show up here as
 * processes whose chain jumps to a subreaper or PID 1.
 *
 * Build:  make ppid_chain
 * Run:    ./ppid_chain
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define MAX_DEPTH 64

/* Read (comm, ppid) for pid. Returns ppid, or -1 on error. */
static long read_link(int pid, char *comm, size_t commsz)
{
    char path[64], buf[1024];
    snprintf(path, sizeof(path), "/proc/%d/stat", pid);
    FILE *f = fopen(path, "r");
    if (!f)
        return -1;
    size_t n = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    if (n == 0)
        return -1;
    buf[n] = '\0';

    /* comm: between first '(' and LAST ')' (same rule as procself.c). */
    char *l = strchr(buf, '('), *r = strrchr(buf, ')');
    if (!l || !r || r < l)
        return -1;
    size_t len = (size_t)(r - l - 1);
    if (len >= commsz)
        len = commsz - 1;
    memcpy(comm, l + 1, len);
    comm[len] = '\0';

    /* After ") ": field 3 (state), field 4 (ppid). */
    char state;
    long ppid;
    if (sscanf(r + 2, "%c %ld", &state, &ppid) != 2)
        return -1;
    return ppid;
}

int main(void)
{
    int pid = (int)getpid();
    char comm[64];

    printf("ancestry of pid %d:\n", pid);
    for (int depth = 0; depth < MAX_DEPTH; depth++) {
        long parent = read_link(pid, comm, sizeof(comm));
        if (parent < 0) {
            printf("  [%d] <vanished — pid exited or hidden>\n", pid);
            return 0;
        }
        printf("  pid %-7d (%s)%s\n", pid, comm,
               pid == 1 ? "  <-- init, the root of all user space" : "");
        if (pid == 1 || parent == 0)
            return 0;
        pid = (int)parent;
    }
    printf("  ... (deeper than %d — giving up)\n", MAX_DEPTH);
    return 0;
}
