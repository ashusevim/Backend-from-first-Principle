/* privilege_denied.c — Poke the ring-0 wall and read the refusal.
 *
 * iopl(3) asks the kernel to let us execute port-I/O instructions directly.
 * That requires CAP_SYS_RAWIO (roughly: root). As a normal user the kernel
 * refuses with EPERM — the boundary, working as designed.
 *
 * Build:  make privilege_denied
 * Run:    ./privilege_denied
 *         sudo ./privilege_denied   # succeeds: now you ARE privileged (still safe: we change nothing)
 */
#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <sys/io.h>
#include <unistd.h>

int main(void)
{
    printf("euid=%d: requesting I/O privilege level 3 (raw port access)...\n",
           (int)geteuid());

    if (iopl(3) == 0) {
        printf("granted?! You have CAP_SYS_RAWIO (root?). Dropping it again.\n");
        iopl(0); /* give it right back; we only wanted the answer */
        return 0;
    }

    printf("refused: iopl() failed: %s (errno=%d)\n", strerror(errno), errno);
    printf("That refusal came from the kernel's capability check:\n");
    printf("  your program (ring 3) → syscall → kernel checks capable(CAP_SYS_RAWIO)\n");
    printf("  → false → returns -EPERM. The CPU never let you near the ports.\n");
    return 0;
}
