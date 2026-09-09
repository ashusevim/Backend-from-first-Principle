/* auxv.c — the kernel's birth letter: /proc/self/auxv, decoded.
 *
 * At execve the kernel pushes the auxiliary vector onto your stack: entry
 * point, program-header address, UID/GID, page size, 16 random bytes
 * (AT_RANDOM — stack canaries + ASLR seed), exec filename... This prints
 * every pair by name, then cross-checks three via getauxval().
 *
 * Build:  make auxv
 * Run:    ./auxv
 */
#define _GNU_SOURCE
#include <elf.h>
#include <fcntl.h>
#include <link.h>
#include <stdio.h>
#include <sys/auxv.h>
#include <unistd.h>

static const char *aname(long t)
{
    switch (t) {
    case AT_NULL: return "AT_NULL";
    case AT_PHDR: return "AT_PHDR";
    case AT_PHENT: return "AT_PHENT";
    case AT_PHNUM: return "AT_PHNUM";
    case AT_PAGESZ: return "AT_PAGESZ";
    case AT_ENTRY: return "AT_ENTRY";
    case AT_UID: return "AT_UID";
    case AT_EUID: return "AT_EUID";
    case AT_GID: return "AT_GID";
    case AT_EGID: return "AT_EGID";
    case AT_CLKTCK: return "AT_CLKTCK";
    case AT_FLAGS: return "AT_FLAGS";
    case AT_RANDOM: return "AT_RANDOM";
    case AT_EXECFN: return "AT_EXECFN";
    case AT_SYSINFO_EHDR: return "AT_SYSINFO_EHDR";
    case AT_HWCAP: return "AT_HWCAP";
    case AT_HWCAP2: return "AT_HWCAP2";
    case AT_SECURE: return "AT_SECURE";
    case AT_MINSIGSTKSZ: return "AT_MINSIGSTKSZ";
    case AT_SYSINFO: return "AT_SYSINFO";
    case AT_BASE: return "AT_BASE";
    case AT_PLATFORM: return "AT_PLATFORM";
    default: {
        static char ub[16]; /* unknown today, self-identifying forever */
        snprintf(ub, sizeof(ub), "AT_%ld", t);
        return ub;
    }
    }
}

int main(void)
{
    /* NOTE: reading /proc/self/auxv (a file) instead of the stack original:
     * same bytes, none of the stack archaeology. */
    int fd = open("/proc/self/auxv", O_RDONLY);
    if (fd < 0) {
        perror("open auxv");
        return 1;
    }
    printf("%-16s %s\n", "TAG", "VALUE");
    for (;;) {
        unsigned long pair[2];
        ssize_t n = read(fd, pair, sizeof(pair));
        if (n == 0)
            break;
        if (n != sizeof(pair)) {
            perror("read auxv");
            return 1;
        }
        printf("%-16s 0x%lx (%lu)\n", aname((long)pair[0]), pair[1], pair[1]);
        if (pair[0] == AT_NULL)
            break;
    }
    close(fd);
    /* Cross-check: getauxval reads the SAME vector (via the stack copy). */
    printf("---\ngetauxval cross-check: ENTRY=0x%lx PAGESZ=%lu UID=%lu\n",
           getauxval(AT_ENTRY), getauxval(AT_PAGESZ), getauxval(AT_UID));
    return 0;
}
