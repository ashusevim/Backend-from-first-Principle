/* myls.c — ls -li rebuilt on readdir(): inode + type + name, zero stat()s.
 *
 * readdir() wraps getdents64: each entry already carries d_ino and d_type,
 * so a type+inode listing needs NO per-file stat (contrast ls -l, which
 * stats every entry for size/mtime — §09.3's tax, measurable in §35).
 * DT_UNKNOWN (some filesystems) falls back to fstatat(dirfd) for the type —
 * a relative lookup inside the already-open dir (§09.5's *at() family).
 *
 * Build:  make myls
 * Run:    ./myls /tmp
 *         ./myls /proc/self/fd
 */
#define _GNU_SOURCE
#include <dirent.h>
#include <fcntl.h>
#include <stdio.h>
#include <sys/stat.h>
#include <unistd.h>

static char type_from_mode(mode_t m)
{
    if (S_ISREG(m))
        return '-';
    if (S_ISDIR(m))
        return 'd';
    if (S_ISLNK(m))
        return 'l';
    if (S_ISFIFO(m))
        return 'p';
    if (S_ISSOCK(m))
        return 's';
    if (S_ISCHR(m))
        return 'c';
    if (S_ISBLK(m))
        return 'b';
    return '?';
}

static char typechar(int dfd, const struct dirent *e)
{
    switch (e->d_type) {
    case DT_REG: return '-';
    case DT_DIR: return 'd';
    case DT_LNK: return 'l';
    case DT_FIFO: return 'p';
    case DT_SOCK: return 's';
    case DT_CHR: return 'c';
    case DT_BLK: return 'b';
    default: break;
    }
    /* DT_UNKNOWN: ask the inode via fstatat (no path building needed). */
    struct stat st;
    if (fstatat(dfd, e->d_name, &st, AT_SYMLINK_NOFOLLOW) != 0)
        return '?';
    return type_from_mode(st.st_mode);
}

int main(int argc, char *argv[])
{
    const char *dir = argc > 1 ? argv[1] : ".";
    DIR *d = opendir(dir);
    if (!d) {
        perror("opendir");
        return 1;
    }
    int dfd = dirfd(d);
    printf("%-12s %s  %s\n", "INODE", "T", "NAME");
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.' &&
            (e->d_name[1] == '\0' ||
             (e->d_name[1] == '.' && e->d_name[2] == '\0')))
            continue; /* skip . and .. */
        printf("%-12lu %c  %s%s\n", (unsigned long)e->d_ino,
               typechar(dfd, e), e->d_name,
               e->d_type == DT_UNKNOWN ? "   (type via fstatat fallback)" : "");
    }
    closedir(d);
    return 0;
}
