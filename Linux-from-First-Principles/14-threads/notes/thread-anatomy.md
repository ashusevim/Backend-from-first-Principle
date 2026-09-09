# Thread Anatomy: stacks, guards, TLS, TIDs, limits

Reference for §14.2/14.5. What the kernel + glibc build per thread.

## Per-thread hardware (kernel task_struct + friends)

- **TID** (`gettid`): the scheduled entity's id. `getpid` = TGID = main
  thread's TID. `/proc/PID/task/TID/` mirrors `/proc/PID/` per thread
  (own `status`, `stat`, `syscall`, `stack`!). `ps -T` / `ps -L` list them.
- **Registers**: own RIP/RSP/register file (context switch swaps them —
  §06 schedules TIDs, "processes" are just the address-space container).
- **Signal mask + pending**: per-thread (a process-wide signal lands on
  ANY thread not blocking it — §07's delivery rule).

## Per-thread userspace (glibc/NPTL builds it in `allocate_stack`)

- **Stack**: 8 MiB default (`ulimit -s`, `pthread_attr_setstacksize`;
  glibc guards: `mmap` 8M+4K with the LOW page `PROT_NONE` — overflow
  SIGSEGVs cleanly instead of corrupting the neighbor mapping).
  Plain UNLABELED 8M anon + 4K guard on kernel 6.1 (no [stack:TID] tag!) — find via exact 8.0M size (§14.2 forensics).
- **TLS block**: `PT_TLS` template (loader-measured at exec) + thread
  pointer: `%fs:0` = own thread descriptor; `__thread` vars are
  `%fs`-relative (one instruction, no lock, no call — `errno` works
  THIS way).
- **`pthread_t`**: userspace handle (an address/ID — NOT the TID!
  `pthread_self` ≠ `gettid`; don't print one expecting the other).

## fork/exec vs threads (the peril rules)

- `fork` in a threaded program → child has ONE thread (the caller).
  Mutexes held by the vanished others stay locked FOREVER in the child
  (their owners don't exist to unlock). Rule: fork-then-exec
  IMMEDIATELY, or don't fork. (`pthread_atfork` handlers: prepare/
  parent/child — a bandage, not a cure.)
- `exec` keeps ONLY the calling thread (§12.3 demolishes the rest).
- `exit`/`return from main` kills ALL threads; `pthread_exit` in main
  lets the others finish (process lives until last thread exits).

## Limits (the ceilings you'll actually hit)

| Ceiling | Value here | Notes |
|---------|-----------|-------|
| `threads-max` | 31,469 | system-wide tasks (`/proc/sys/kernel/threads-max`) |
| `RLIMIT_NPROC` | (ulimit -u) | per-user tasks |
| `pids.max` (cgroup) | not enabled here | §26's container killer |
| VSZ | threads×8M stacks + arenas (§11!) | the PRACTICAL ceiling (1000 threads ≈ 8G VSZ) |
| default stack | 8 MiB | shrink via attr (256K worked in §11) |
