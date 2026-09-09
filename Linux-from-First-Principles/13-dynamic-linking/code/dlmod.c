/* dlmod.c — linking as a runtime API: dlopen + dlsym + call.
 *
 * No libb at LINK time (ldd dlmod shows libc only); at RUN time we map
 * ./libb.so by hand and call b() through the looked-up pointer. Plugins
 * in 30 lines. (glibc >= 2.34 folded libdl into libc; -ldl kept for
 * older toolchains.)
 *
 * Build:  make dlmod      (run from this dir: ./libb.so lives here)
 * Run:    ./dlmod
 *         ldd ./dlmod     (no libb — the link exists only at runtime)
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>

int main(void)
{
    printf("dlmod: opening ./libb.so BY HAND (ldd shows no such NEEDED)...\n");
    void *h = dlopen("./libb.so", RTLD_NOW); /* NOW: fail fast, no lazy */
    if (!h) {
        fprintf(stderr, "dlopen: %s\n", dlerror());
        return 1;
    }
    dlerror(); /* clear */
    typedef void (*b_fn)(void);
    b_fn b = (b_fn)dlsym(h, "b");
    const char *err = dlerror();
    if (err) {
        fprintf(stderr, "dlsym: %s\n", err);
        return 1;
    }
    printf("dlmod: b found at %p — calling:\n", (void *)b);
    b();
    dlclose(h);
    return 0;
}
