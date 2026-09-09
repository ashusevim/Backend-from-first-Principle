# Notes — Process states, precisely

## The letters (`State:` in status, `STAT` in ps)

| Letter | `task_state` | Scheduler view | Killable? | Typical holder |
|--------|--------------|----------------|-----------|----------------|
| `R` | `TASK_RUNNING` | on CPU or on runqueue | yes | compute loop, or anything briefly |
| `S` | `TASK_INTERRUPTIBLE` | sleeping, wakes on signal OR event | yes | `sleep`, `read` on terminal, servers in `accept` |
| `D` | `TASK_UNINTERRUPTIBLE` (+ `TASK_KILLABLE`) | sleeping, wakes on event only (KILLABLE: also fatal signals) | `D`: NO (waits); killable-`D`: fatal signals only | disk/NFS waits, some locks |
| `I` | `TASK_IDLE` | like `S`, but excluded from load average | yes | kernel worker threads parked |
| `T` | `__TASK_STOPPED` | suspended, not scheduled until `SIGCONT` | yes (SIGKILL works; `SIGCONT` resumes) | `Ctrl-Z` job, `kill -STOP` |
| `t` | `__TASK_TRACED` | suspended by tracer (`ptrace`) | via tracer | any tracee at a trap (`mini-strace` stops!) |
| `Z` | `EXIT_ZOMBIE` | dead; `task_struct` kept for exit code | already dead — only parent's `wait()` removes it | parent forgot to reap (§05) |
| `X`/`x` | `EXIT_DEAD` | dead and reaped / dying | n/a | essentially unobservable |
| `K` | `TASK_KILLABLE` (shown raw) | killable sleep | fatal signals | rare; usually folded into `D` display |
| `W`/`P` | `TASK_WAKING`/`TASK_PARKED` | mid-wakeup / parked kthread | — | transient / kthreads only |

## `ps STAT` extra flags (appended after the letter)

| Flag | Meaning | Example |
|------|---------|---------|
| `<` | high priority (negative `nice`) | `<` in `R<` |
| `N` | low priority (positive `nice`) | `SN` |
| `L` | pages locked in memory (`mlock`) | `SLl` (databases, RT apps) |
| `s` | session leader | `Ss` (your login shell, daemons) |
| `l` | multithreaded (`CLONE_THREAD`) | `Sl` (browsers, JVMs) |
| `+` | in the foreground process group | `S+` (whatever you're running now) |

## Why `D` exists (the 30-second version)

Some sleeps happen **holding non-preemptible kernel state** — e.g. inside a
device driver mid-transfer, or waiting on a mutex that a signal handler path
can't safely unwind. Waking such a task for a signal would corrupt the
kernel, so the kernel doesn't: the signal stays **pending** until the task
leaves `D`, *then* it's delivered. `SIGKILL` included — it's pending, not
ignored. Consequences:

- `kill -9 <D-state-pid>` appears to do nothing. Correct behavior!
- A task stuck in `D` forever (wedged NFS, dead block device) is unfixable
  from user space. This is working as designed — the alternative is a panic.
- Modern code uses `TASK_KILLABLE` (kills the wait on fatal signals, cleanly
  unwinding). `ps` still shows `D` — you can't tell them apart from outside.

## Zombie in one paragraph (full story: §05)

`exit()` frees nearly everything — but the **exit status must survive until
the parent collects it** via `wait()`. Between death and collection, the
remains (a `task_struct` with `EXIT_ZOMBIE` + the code) are the zombie. A
zombie holds no memory, no fds, no CPU — just a PID slot and an integer. Cure:
fix the parent (reap your children!) or kill the parent (orphan zombies get
reparented to init, which reaps on sight).
