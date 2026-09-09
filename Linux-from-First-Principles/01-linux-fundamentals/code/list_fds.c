/* list_fds.c — List this process's open files via /proc/self/fd.
 *
 * The kernel renders every process's file-descriptor table as symlinks.
 * Reading them with readlink() is exactly how `lsof` and debuggers inspect
 * open files. Note /proc/self always means "the process doing the reading".
 *
 * Build:  make list_fds
 * Run:    ./list_fds
 *         ./list_fds < /etc/hostname 3>/tmp/x   # watch fd 0 and fd 3 change
 */
#define _GNU_SOURCE /* readlink(), ttyname() visibility under -std=c11 */
#include <dirent.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void)
{
    DIR *d = opendir("/proc/self/fd");
    if (!d) {
        perror("opendir /proc/self/fd");
        return 1;
    }

    struct dirent *e;
    char path[sizeof("/proc/self/fd/") + 255], target[256];
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.')
            continue;
        snprintf(path, sizeof(path), "/proc/self/fd/%s", e->d_name);
        ssize_t n = readlink(path, target, sizeof(target) - 1);
        if (n < 0) {
            perror(path);
            continue;
        }
        target[n] = '\0';
        printf("fd %s -> %s\n", e->d_name, target);
        /* fd N is the directory stream of /proc/self/fd itself — observing
         * the fd table adds an entry to it (observer effect, kernel style). */
    }
    closedir(d);

    /* stdin/stdout/stderr are just fds 0,1,2. Prove it: */
    if (strcmp(ttyname(STDIN_FILENO) ? : "", "") != 0)
        printf("(stdin is a terminal: %s)\n", ttyname(STDIN_FILENO));
    else
        printf("(stdin is NOT a terminal — it's a %s)\n",
               isatty(STDIN_FILENO) ? "tty?" : "pipe/file/redirect");
    return 0;
}
