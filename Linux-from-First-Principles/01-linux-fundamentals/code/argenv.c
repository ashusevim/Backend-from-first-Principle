/* argenv.c — See what execve() handed this process at birth.
 *
 * Every process starts life with two arrays from the kernel: argv (arguments)
 * and envp (environment). They live at the very top of the stack; `env`
 * just prints the second one.
 *
 * Build:  make argenv
 * Run:    ./argenv hello world
 *         MYVAR=hi ./argenv
 */
#include <stdio.h>

/* The third parameter is a glibc extension: the kernel passes envp on the
 * initial stack, and the C runtime forwards it to main. */
int main(int argc, char *argv[], char *envp[])
{
    printf("--- argv (%d items) ---\n", argc);
    for (int i = 0; i < argc; i++)
        printf("argv[%d] = \"%s\"\n", i, argv[i]);

    printf("--- envp (first 6 of them) ---\n");
    for (int i = 0; i < 6 && envp[i] != NULL; i++)
        printf("envp[%d] = \"%s\"\n", i, envp[i]);
    printf("(the rest is yours to explore with printenv)\n");
    return 0;
}
