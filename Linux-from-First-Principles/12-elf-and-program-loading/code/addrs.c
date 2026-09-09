/* addrs.c — ASLR made visible: code, stack, heap, libc across runs.
 *
 * Prints four addresses from four regions. Every run slides (PIE + mmap +
 * stack randomization); `setarch -R` freezes them. Experiment 03 runs it
 * 5x and diffs. (Compare against readelf -l vaddrs for the PIE slide.)
 *
 * Build:  make addrs
 * Run:    ./addrs; ./addrs
 *         setarch -R ./addrs; setarch -R ./addrs
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>

static int answer = 42;

int main(void)
{
    int stack_var = 1;
    int *heap_var = malloc(sizeof(int));
    if (!heap_var) {
        perror("malloc");
        return 1;
    }
    *heap_var = 2;
    printf("code(main)  %p\n", (void *)main);
    printf("data(answer)%p\n", (void *)&answer);
    printf("stack(var)  %p\n", (void *)&stack_var);
    printf("heap(chunk) %p\n", (void *)heap_var);
    printf("libc(printf)%p\n", (void *)printf);
    free(heap_var);
    return 0;
}
