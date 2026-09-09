/* libwho.c — a shared lib with a constructor (built as libwho.so). */
#include <stdio.h>

__attribute__((constructor)) static void who_ctor(void)
{
    puts("libwho.so: constructor");
}

void who(void)
{
    puts("libwho.so: who() called from main");
}
