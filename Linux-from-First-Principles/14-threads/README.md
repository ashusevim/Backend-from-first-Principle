# 14 — Threads

**Question this section answers:** *What IS a thread — versus a process?
What do threads share, what's private, and what breaks when you forget?*

By the end you can: explain `clone()` flags as the one primitive behind
fork/vfork/pthreads; show same-PID/different-TID live; draw the
shared-vs-private line from memory; and DEMONSTRATE a data race (then
point at §15 for the fix).

---

## 1. `clone()`: the one primitive (fork is just flags)

Linux has ONE thread/process creator: `clone(fn, stack, flags, ...)`.
Everything else is a flag preset:

| Call | Flags (simplified) | Meaning |
|------|-------------------|---------|
| `fork` | `SIGCHLD` | share NOTHING (CoW copies, §10.7) |
| `vfork` | `VFORK \| VFORK_DONE`… | share VM, parent SUSPENDED (§05) |
| `pthread_create` | `VM \| FS \| FILES \| SIGHAND \| THREAD \| SYSVSEM \| SETTLS…` | share (nearly) everything |
| `clone3` | explicit struct | the modern programmable form |

NPTL (Native POSIX Threads Library, in glibc since 2.6) maps pthreads 1:1
onto kernel tasks: each thread has a **TID** (`gettid()` — the "real" id;
`getpid()` returns the TGID = main thread's TID). `ps -T` / `/proc/PID/task/`
list them; the scheduler (§06) schedules threads, not processes.

▶ **Reference:** [notes/clone-flags.md](notes/clone-flags.md) — every
`CLONE_*` that matters + which call sets it.

## 2. Shared vs private: the line

**Shared** (one per process): address space (heap, globals, mmaps),
file descriptors (§08), signal DISPOSITIONS (§07), cwd/umask, PID.
**Private** (one per thread): registers (RIP/RSP!), **stack** (8 MiB +
guard page each — plain 8M anon (kernel 6.1 tags only `[stack]`), errno, signal MASK, scheduling
policy, **TLS** (§4), TID.

The line has teeth: `fork()` in a threaded program clones ONLY the calling
thread (locks held by the dead others stay locked forever — the
`fork+threads=peril` rule; `pthread_atfork` exists, barely helps).
`exec()` vaporizes all threads but the caller (§12.3). A signal to the
PROCESS can land on ANY thread that doesn't block it (§07).

▶ **Code:** `code/thrinfo.c` — N threads print pid (`getpid`, SAME),
tid (`gettid`, DIFFERENT), `pthread_self`, stack-var address (different
8M regions), TLS address (different). Identity, measured.
▶ **Diagram:** [diagrams/process-vs-threads.md](diagrams/process-vs-threads.md).

## 3. Create, join, detach — and the race you just wrote

`pthread_create` (stack auto-mapped, guard page installed),
`pthread_join` (wait + harvest return — the `waitpid` of threads, §05),
`pthread_detach` (fire-and-forget — like a daemon that reaps itself).
Return from start-routine = `pthread_exit(ret)`; `main` returning calls
`exit()` (kills ALL threads!) while `pthread_exit(main)` lets them run.

And now the §15 trailer — the shared counter with NO lock:

▶ **Code:** `code/race.c` — 4 threads × 1M `counter++`. `++` is
load-add-store (3 insns); interleavings LOSE updates. Expected 4,000,000;
measured: less, differently every run (experiment 02 runs it 3×).
The fix (mutexes, atomics) is §15's whole job — this section just proves
the disease is real.

## 4. TLS: globals with one copy per thread

`__thread int x;` — every thread gets its OWN `x` (loader carves `PT_TLS`
template + per-thread area; `%fs` points at yours). `errno` IS one
(that's why threaded errno works!). Cost: one segment-relative access —
free-ish. Use for: per-thread caches (§11's tcache!), RNG state, scratch
buffers that mustn't lock.

▶ **Code:** `code/tls.c` — shared counter (racy, §3) BESIDE a `__thread`
counter (each thread counts its own million, sums agree EXACTLY).
Same loop, two storage classes, opposite correctness.

## 5. Stacks, guards, limits (read-only tour)

Default stack 8 MiB (`ulimit -s`, `pthread_attr_setstacksize` — §11's
`arenas.c` used 256 KiB), one PROT_NONE guard page below (overflow →
clean SIGSEGV, not silent corruption). Limits: `/proc/sys/kernel/
threads-max` (31k here), `RLIMIT_NPROC`, cgroup `pids.max` (absent here —
controller not enabled; §26 turns it on), and VIRTUAL address space
(threads × 8M stacks + §11 arenas = the real ceiling).

▶ **Reference:** [notes/thread-anatomy.md](notes/thread-anatomy.md).
▶ Experiment 01: live task census (`/proc/PID/task` + `ps -T` + the
unlabeled 8M thread stacks). Experiment 03: the limits tour.

---

## Experiments

```bash
cd experiments/
./01-identity.sh           # thrinfo + /proc/PID/task census + unlabeled-8M thread stacks
./02-race.sh               # race x3: less than 4M, differently every time
./03-limits.sh             # threads-max/pids/stack-size tour (read-only)
```

## Build the code

```bash
cd code/
make
./thrinfo 4
./race 4 1000000
./tls 4 1000000
```

## Exercises

1. `./thrinfo 4 5 &` → `ls /proc/$!/task | wc -l` (5: main + 4) →
   `cat /proc/$!/task/*/status | grep -c '^State'` → `wait`. Now
   `ps -T -p <pid>` on a rerun — same 5 tids?
2. `race 2 5000000` vs `race 8 500000` (same total work): which loses
   MORE updates, and why? (More threads = more interleavings per
   increment = more lost stores. Contention scales the bug.)
3. Guard page, felt: recursive fibber with a 1 MiB stack
   (`pthread_attr_setstacksize`) vs 8 MiB — measure depth-to-SEGV both
   ways (exit 139, `dmesg`-free — the guard did its job).
4. `errno` is TLS: two threads, one `open("/nonexistent")`s in a loop,
   the other spins `errno = 0; check` — never sees the other's ENOENT.
   (15 lines. Then imagine errno GLOBAL: chaos — that's why it's not.)
5. `strace -f -e trace=clone,clone3 ./thrinfo 2` (here: `mini_strace` +
   grep `clone`) — count the clones (2: one per thread — main was
   `clone`d by the SHELL, before the trace began).
6. (Think) `fork()` in a 4-thread program: how many threads in the child?
   (ONE — the caller. The others' stacks/locks vanish mid-state. Rule:
   fork-then-exec IMMEDIATELY in threaded programs, or don't fork.)

## Further reading (in this track)

- Next: [15 — Concurrency and Synchronization](../15-concurrency-and-synchronization/)
  *(coming soon)* — mutexes, atomics, the race's cure.
- Back: [05 — Process Creation](../05-process-creation/) (fork/waitpid
  twins), [10 — Virtual Memory](../10-virtual-memory/) (stacks/Guards/TLS
  areas), [11 — Memory Management](../11-memory-management/) (arenas!).
- Reference: [notes/clone-flags.md](notes/clone-flags.md),
  [notes/thread-anatomy.md](notes/thread-anatomy.md).
- Diagrams: [diagrams/process-vs-threads.md](diagrams/process-vs-threads.md).
