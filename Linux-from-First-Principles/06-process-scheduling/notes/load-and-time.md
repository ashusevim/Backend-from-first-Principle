# Notes — Load average and `time`, precisely

## Load average (the three numbers in `uptime`/`top`)

```text
load average: 0.42, 0.31, 0.19   (1-min, 5-min, 15-min exponentially-damped averages)
```

What it counts: **the average number of tasks in `R` (runnable) or `D`
(uninterruptible sleep)**. Not CPU percent! Rules of thumb:

- Load ≈ number of CPUs → CPUs saturated, no waiting. Load >> CPUs → tasks
  queue (latency climbs). Load << CPUs → idle headroom.
- `D`-state tasks inflate load WITHOUT using CPU (stuck NFS = load 50 on an
  idle box — the classic "high load, nothing running" mystery, solved: §04).
- Per-CPU normalization is on you: load 4.0 is idle on 16 CPUs, saturated
  on 4. (`/proc/loadavg` adds `running/total_threads` and last PID.)

## `time` output (bash builtin + `/usr/bin/time -v`)

```text
real    0m4.021s   ← wall clock (what you waited)
user    0m3.985s   ← CPU in user mode (summed over all threads!)
sys     0m0.004s   ← CPU in kernel mode
```

Reading it:

- `user+sys ≈ real` → compute-bound, single-threaded, uncontended.
- `user+sys << real` → it SLEPT (I/O, locks, `sleep`) — the gap is waiting.
- `user > real` → multithreaded (user sums threads; §14).
- `sys` large → syscall-heavy (tracing? tiny I/O? — §35 profiles this).
- `/usr/bin/time -v` adds: max RSS, voluntary/involuntary switches,
  page faults, fs I/O — a one-line performance lab. (If missing, `getrusage`
  in C reads the same counters: `ctxcount.c` shows how.)

## `getrusage` fields worth knowing (`<sys/resource.h>`)

`ru_utime`/`ru_stime` (user/sys CPU), `ru_nvcsw`/`ru_nivcsw` (the switch
counters), `ru_minflt`/`ru_majflt` (page faults, §10), `ru_maxrss` (peak RSS),
`ru_inblock`/`ru_oublock` (fs I/O). `RUSAGE_SELF` = this process (all threads
summed); `RUSAGE_CHILDREN` = reaped children (what shells use for `times`).
