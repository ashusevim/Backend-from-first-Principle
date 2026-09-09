/* statshow.c — stat/lstat decoded: the ls -l first column, derived by hand.
 *
 * For each path: lstat (the link itself) + stat (the target), printing type,
 * inode, links, size/blocks, and the 10-char mode string built bit by bit
 * (type + rwx*3 + suid/sgid/sticky) — exactly what `ls -l` computes.
 *
 * Build:  make statshow
 * Run:    ./statshow /bin/true /tmp /dev/null
 *         ln -s /bin/true /tmp/sl; ./statshow /tmp/sl; rm /tmp/sl
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

/* Build "-rwxr-xr-x"-style string from st_mode. buf must hold 11 chars. */
static void modestring(mode_t m, char *buf)
{
    buf[0] = S_ISREG(m) ? '-' : S_ISDIR(m) ? 'd' : S_ISLNK(m) ? 'l'
             : S_ISFIFO(m) ? 'p' : S_ISSOCK(m) ? 's' : S_ISCHR(m) ? 'c'
             : S_ISBLK(m)   ? 'b'
                            : '?';
    const char rwx[] = "rwxrwxrwx";
    const mode_t bits[] = { S_IRUSR, S_IWUSR, S_IXUSR, S_IRGRP, S_IWGRP,
                            S_IXGRP, S_IROTH, S_IWOTH, S_IXOTH };
    for (int i = 0; i < 9; i++)
        buf[1 + i] = (m & bits[i]) ? rwx[i] : '-';
    /* suid/sgid/sticky override the three x slots (s/S, s/S, t/T). */
    if (m & S_ISUID)
        buf[3] = (m & S_IXUSR) ? 's' : 'S';
    if (m & S_ISGID)
        buf[6] = (m & S_IXGRP) ? 's' : 'S';
    if (m & S_ISVTX)
        buf[9] = (m & S_IXOTH) ? 't' : 'T';
    buf[10] = '\0';
}

static void show(const char *path)
{
    struct stat lst, st;
    char mode[11];

    printf("=== %s ===\n", path);
    if (lstat(path, &lst) != 0) {
        perror("lstat");
        return;
    }
    modestring(lst.st_mode, mode);
    printf("lstat: %s ino=%lu links=%lu size=%ld blocks=%ld uid=%d gid=%d\n",
           mode, (unsigned long)lst.st_ino, (unsigned long)lst.st_nlink,
           (long)lst.st_size, (long)lst.st_blocks, (int)lst.st_uid,
           (int)lst.st_gid);

    if (S_ISLNK(lst.st_mode)) {
        char target[256];
        ssize_t n = readlink(path, target, sizeof(target) - 1);
        if (n > 0) {
            target[n] = '\0';
            printf("  symlink -> \"%s\" (size %ld = path length!)\n",
                   target, (long)lst.st_size);
        }
        if (stat(path, &st) != 0) {
            printf("  stat (follow): FAILED — dangling link\n");
            return;
        }
        modestring(st.st_mode, mode);
        printf("stat : %s ino=%lu (the TARGET's inode — different!)\n",
               mode, (unsigned long)st.st_ino);
        return;
    }
    if (S_ISCHR(lst.st_mode) || S_ISBLK(lst.st_mode))
        printf("  device %u,%u (major=driver, minor=instance)\n",
               major(lst.st_rdev), minor(lst.st_rdev));
    char *mt = ctime(&lst.st_mtime);
    mt[24] = '\0'; /* strip ctime's trailing newline */
    printf("  mtime=%ld (%s)\n", (long)lst.st_mtime, mt);
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "usage: %s path...\n", argv[0]);
        return 1;
    }
    for (int i = 1; i < argc; i++)
        show(argv[i]);
    return 0;
}
