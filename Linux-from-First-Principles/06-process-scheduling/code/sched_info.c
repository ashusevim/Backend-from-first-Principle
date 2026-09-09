/* sched_info.c — Print your own scheduling parameters, then try to go RT.
 *
 * Shows: policy (SCHED_OTHER/FIFO/...), nice value, RT priority, and CPU
 * affinity mask. Then attempts sched_setscheduler(SCHED_FIFO) — which fails
 * with EPERM unless privileged (an RT task could starve the whole machine,
 * so the kernel gates it: the §02 wall, in scheduling form).
 *
 * Build:  make sched_info
 * Run:    ./sched_info
 *         taskset -c 0 ./sched_info     # watch the affinity mask shrink
 */
#define _GNU_SOURCE /* sched_getaffinity CPU_* macros */
#include <errno.h>
#include <sched.h>
#include <stdio.h>
#include <string.h>
#include <sys/resource.h>
#include <unistd.h>

static const char *policy_name(int p)
{
    switch (p) {
    case SCHED_OTHER: return "SCHED_OTHER (normal/CFS)";
    case SCHED_FIFO: return "SCHED_FIFO (realtime)";
    case SCHED_RR: return "SCHED_RR (realtime round-robin)";
    case SCHED_BATCH: return "SCHED_BATCH (throughput CFS)";
    case SCHED_IDLE: return "SCHED_IDLE (scavenger)";
    case SCHED_DEADLINE: return "SCHED_DEADLINE (earliest-deadline)";
    default: return "???";
    }
}

int main(void)
{
    int policy = sched_getscheduler(0);
    struct sched_param sp;
    sched_getparam(0, &sp);
    errno = 0;
    int ni = getpriority(PRIO_PROCESS, 0);

    printf("pid=%d policy=%s\n", (int)getpid(), policy_name(policy));
    printf("rt_priority=%d nice=%d (errno after getpriority=%d)\n",
           sp.sched_priority, ni, errno);

    cpu_set_t mask;
    CPU_ZERO(&mask);
    if (sched_getaffinity(0, sizeof(mask), &mask) == 0) {
        printf("affinity: ");
        for (int cpu = 0; cpu < CPU_SETSIZE; cpu++)
            if (CPU_ISSET(cpu, &mask))
                printf("%d ", cpu);
        printf("(currently on cpu %d)\n", sched_getcpu());
    }

    /* The ask: become SCHED_FIFO prio 1. Expect EPERM as mortals. */
    struct sched_param fifo = { .sched_priority = 1 };
    printf("trying sched_setscheduler(SCHED_FIFO, prio 1)... ");
    fflush(stdout);
    if (sched_setscheduler(0, SCHED_FIFO, &fifo) == 0) {
        printf("GRANTED (you are privileged!) — switching back to OTHER.\n");
        struct sched_param other = { .sched_priority = 0 };
        sched_setscheduler(0, SCHED_OTHER, &other);
    } else {
        printf("refused: %s — an unprivileged RT task could starve init.\n",
               strerror(errno));
    }
    return 0;
}
