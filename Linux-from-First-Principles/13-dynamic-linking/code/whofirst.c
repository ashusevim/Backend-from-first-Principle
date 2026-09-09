/* whofirst.c — init order: lib constructors run BEFORE main.
 *
 * Links libwho.so (which has its own constructor) and carries one too.
 * Expected order: libwho ctor -> main-ctor -> main. The loader runs
 * .init_array in dependency order BEFORE jumping to your entry (§13.1).
 * (Also the LD_PRELOAD target: every line goes through puts — exp 03.)
 *
 * Build:  make whofirst
 * Run:    ./whofirst
 */
#include <stdio.h>

void who(void);

__attribute__((constructor)) static void main_ctor(void)
{
    puts("whofirst: main's constructor");
}

int main(void)
{
    puts("whofirst: main");
    who();
    return 0;
}
