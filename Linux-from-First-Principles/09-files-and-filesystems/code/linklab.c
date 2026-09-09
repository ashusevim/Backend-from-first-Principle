/* linklab.c — The whole links section, executable: hard vs symlink vs copy.
 *
 * In a fresh mkdtemp dir: create orig, hardlink it, symlink it, copy it;
 * print all four inodes; unlink orig; show hard+copy survive, symlink
 * dangles (lstat ok, stat fails). Cleans up after itself.
 *
 * Build:  make linklab
 * Run:    ./linklab
 */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

static void show(const char *label, const char *path)
{
    struct stat lst, st;
    if (lstat(path, &lst) != 0) {
        printf("%-6s lstat FAILED (gone)\n", label);
        return;
    }
    if (stat(path, &st) == 0)
        printf("%-6s ino=%-8lu links=%lu size=%ld\n", label,
               (unsigned long)lst.st_ino, (unsigned long)lst.st_nlink,
               (long)lst.st_size);
    else
        printf("%-6s ino=%-8lu links=%lu DANGLING (stat fails, lstat ok)\n",
               label, (unsigned long)lst.st_ino, (unsigned long)lst.st_nlink);
}

int main(void)
{
    char dir[] = "/tmp/linklab-XXXXXX";
    if (!mkdtemp(dir)) {
        perror("mkdtemp");
        return 1;
    }
    char orig[128], hard[128], sym[128], copy[128];
    snprintf(orig, sizeof(orig), "%s/orig", dir);
    snprintf(hard, sizeof(hard), "%s/hard", dir);
    snprintf(sym, sizeof(sym), "%s/sym", dir);
    snprintf(copy, sizeof(copy), "%s/copy", dir);

    int fd = open(orig, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) {
        perror("open orig");
        return 1;
    }
    if (write(fd, "payload\n", 8) != 8) {
        perror("write");
        return 1;
    }
    close(fd);

    if (link(orig, hard) != 0) { /* hardlink: same inode, nlink 1->2 */
        perror("link");
        return 1;
    }
    if (symlink(orig, sym) != 0) { /* symlink: own inode, content = path */
        perror("symlink");
        return 1;
    }
    /* copy: cp(1)'s core loop in 5 lines (open, read, write — §08!). */
    int in = open(orig, O_RDONLY), out = open(copy, O_WRONLY | O_CREAT, 0644);
    char buf[64];
    ssize_t n;
    while ((n = read(in, buf, sizeof(buf))) > 0)
        if (write(out, buf, (size_t)n) != n) {
            perror("copy write");
            return 1;
        }
    close(in);
    close(out);

    printf("--- before rm orig ---\n");
    show("orig", orig);
    show("hard", hard);
    show("sym", sym);
    show("copy", copy);

    printf("--- rm orig (unlink: nlink-- on inode, name gone) ---\n");
    unlink(orig);
    show("orig", orig);
    show("hard", hard);
    show("sym", sym);
    show("copy", copy);

    printf("--- contents after ---\n");
    printf("hard: ");
    fflush(stdout);
    in = open(hard, O_RDONLY);
    while ((n = read(in, buf, sizeof(buf) - 1)) > 0) {
        buf[n] = '\0';
        printf("%s", buf);
    }
    close(in);
    printf("sym : ");
    fflush(stdout);
    if (open(sym, O_RDONLY) < 0)
        printf("<open fails: dangling>\n");

    unlink(hard);
    unlink(sym);
    unlink(copy);
    rmdir(dir);
    return 0;
}
