# Notes — Scheduling classes, policies, priorities

## The hierarchy (first class with a runnable task wins)

```text
stop (migration/stopper threads — kernel only, above everything)
 ├── dl (SCHED_DEADLINE: runtime/period/deadline, EDF + bandwidth caps)
 ├── rt (SCHED_FIFO / SCHED_RR: static prio 1–99, first listed wins ties)
 ├── fair (SCHED_OTHER/normal + SCHED_BATCH: CFS, weight by nice)
 │    └── SCHED_IDLE (*: only when NOTHING else wants the CPU)
 └── idle (per-CPU idle thread: runs HLT)
```

## Policies and their priority ranges

| Policy | Constant | Prio range | Who | Notes |
|--------|----------|------------|-----|-------|
| `SCHED_OTHER` | 0 | 0 (fixed; `nice` biases instead) | default for everything | CFS; `ps cls` = `TS` |
| `SCHED_FIFO` | 1 | 1–99 (higher = first) | privileged RT | runs until it sleeps/yields/preempted-by-higher-RT — **can starve all** |
| `SCHED_RR` | 2 | 1–99 | privileged RT | FIFO + round-robin quantum among equals |
| `SCHED_BATCH` | 3 | 0 | batch builds | CFS with longer slices, less wakeup preemption |
| `SCHED_IDLE` | 5 | 0 | scavengers | runs only on otherwise-idle CPU |
| `SCHED_DEADLINE` | 6 | (runtime, deadline, period) | hard RT | EDF; needs `sched_setattr`; bandwidth-limited |

## The syscalls and tools

| Action | Syscall(s) | Tool |
|--------|------------|------|
| get/set policy+prio | `sched_getscheduler`, `sched_setscheduler` (needs `CAP_SYS_NICE` for RT) | `chrt -p <pid>`, `chrt -f 50 cmd` |
| get/set nice | `getpriority`/`setpriority` (`PRIO_PROCESS`) | `nice -n 10 cmd`, `renice` |
| get/set affinity | `sched_getaffinity`/`sched_setaffinity` | `taskset -c 0,1 cmd`, `taskset -p <pid>` |
| yield CPU | `sched_yield` | (rarely what you want — it requeues you *last*) |
| max/min RT prio | `sched_get_priority_max/min` | `chrt -m` (lists policies) |
| deadline attrs | `sched_setattr`/`sched_getattr` | `chrt -d --sched-runtime …` |

## `nice` → weight (the table CFS actually uses)

`nice -20 … 19` maps to weights `88761 … 15`, each step ≈ ×1.25 (i.e. 10% CPU
per level in a 2-task race is the *folk* version; exact shares = weight
fractions). Anchor points: nice `-20`→88761, `-10`→9548, `-5`→3121,
`0`→1024, `5`→335, `10`→110, `15`→36, `19`→15.

Rules: unprivileged tasks may only *increase* nice (be nicer); decreasing
needs `CAP_SYS_NICE` (root has it; `RLIMIT_NICE` can grant a slice to others).
`ps -o ni` shows it; the `N` (low prio) and `<` (high prio) flags in `STAT`
(§04) derive from it.
