/* identity.c — Ask the kernel who this process is.
 *
 * What `id` + `uname` do, without the formatting: a handful of syscalls
 * (getpid, getppid, getuid, geteuid, getgid, uname) and printing the answers.
 *
 * Build:  make identity
 * Run:    ./identity
 */
#include <stdio.h>
#include <sys/utsname.h>
#include <unistd.h>

int main(void)
{
    struct utsname u;

    /* Each of these is (almost) a direct system call: the kernel reads
     * fields out of our task_struct / credentials and hands them back. */
    printf("pid   = %d  (this process)\n", (int)getpid());
    printf("ppid  = %d  (parent — the shell that forked us)\n", (int)getppid());
    printf("uid   = %d  euid = %d  gid = %d\n",
           (int)getuid(), (int)geteuid(), (int)getgid());

    if (uname(&u) == 0) {
        printf("sys   = %s %s %s\n", u.sysname, u.release, u.version);
        printf("machine = %s\n", u.machine);
    }
    return 0;
}
