# 06 — Process Scheduling

**Question this section answers:** *When 300 processes want 2 CPUs, who runs —
and how does the kernel decide, 1000 times a second, without playing favorites?*

By the end you can: explain scheduling classes and CFS (`vruntime`) in plain
language, measure fairness and `nice` ratios yourself, account every context
switch as voluntary or involuntary, and read `/proc/<pid>/sched` like a
scheduler developer.

---

## 1. The problem: N tasks, M CPUs, N >> M

At any moment, hundreds of tasks are *runnable* (state `R`, §04) and a
handful of CPUs exist. The scheduler's job, on every timer tick and every
wakeup/sleep:

1. **Pick** the most deserving runnable task per CPU.
2. **Preempt** the current one if someone more deserving appears.
3. Do it in **microseconds** (scheduler overhead is stolen CPU), and be
   **fair** (no starvation) while honoring **priorities** (some tasks matter
   more).

The classic trilemma — *fairness vs latency vs throughput* — is tuned, not
solved: interactive tasks want low latency (wake → run NOW), batch tasks want
throughput (long slices, few switches), RT tasks want guarantees. Linux's
answer is layers: **classes** order kinds of tasks; **CFS** shares fairly
within the normal class; **`nice`/RT priorities** bias the shares.

## 2. Scheduling classes (the pecking order)

Linux doesn't have one scheduler — it has a **hierarchy of classes**, asked
in order. The first class with a runnable task wins the CPU:

```text
highest priority
     │
     ▼
┌─────────────┐  SCHED_DEADLINE ── earliest-deadline-first (hard RT)
├─────────────┤  SCHED_FIFO / SCHED_RR ── fixed priorities 1–99,
│  REALTIME   │  always beat normal tasks (needs privilege!)
├─────────────┤
│  CFS        │  SCHED_OTHER (normal, nice -20..19) ── you are here
│  (fair)     │  SCHED_BATCH (throughput-oriented) / SCHED_IDLE (scraps)
├─────────────┤
│  IDLE       │  the per-CPU idle task (runs the HLT when nothing else)
└─────────────┘
     │
     ▼
lowest priority
```

Consequences to internalize:

- A looping `SCHED_FIFO` task at any priority **starves everything** below
  it — including your shell. That's why creating RT tasks needs privilege
  (`CAP_SYS_NICE`), and why `chrt -f 50 ./spinner` as a normal user fails
  with `EPERM` (try it — experiment 02).
- `nice` only matters **within** the normal class. `nice 19` still beats any
  runnable RT task? No — reversed: **any RT task beats all nice levels.**
  Classes first, priorities second.
- `ps -o cls,rtprio,ni,pri` shows each process's class (`TS`=CFS/Other,
  `FF`/`RR`, `B`, `IDL`, `DLN`), RT priority, and nice. Run it on your own
  processes now.

▶ **Reference:** [notes/sched-classes.md](notes/sched-classes.md) — every
policy, priority range, and the syscalls that set them.

## 3. CFS in 60 seconds: virtual time, not timeslices

Classic schedulers hand out fixed timeslices ("everyone gets 10ms in turn").
CFS (Completely Fair Scheduler) instead tracks **`vruntime`** — how much CPU
each task has *consumed*, normalized by its weight — and always runs the task
with the **smallest vruntime** (kept in a red-black tree for O(log n) picks):

```text
task A (nice 0, weight 1024)      task B (nice 10, weight 110)
vruntime += delta × (1024/1024)   vruntime += delta × (1024/110)  ← ~9× faster!
     │                                     │
     └────────── run whoever is smallest ─┘
                    ⇒ A gets ~90% of CPU, B ~10%
```

So: **`nice` levels are weights** (nice 0 = 1024; each level ≈ ±10%…
precisely the kernel's `sched_prio_to_weight[40]` table), and "timeslices"
*emerge* from the race to stay smallest — no fixed quantum. Latency target
(`sched_latency`, ~6ms) bounds how long until everyone got a turn; the tree
makes the pick cheap.

You can *see* vruntime: `grep -E 'se.vruntime|nr_switches' /proc/self/sched`
after burning CPU — your vruntime grew by about the nanoseconds you burned
(at nice 0). Experiment 03 does exactly this.

▶ **Experiment:** `experiments/01-fairness.sh` (equal shares) and
`experiments/02-nice-matters.sh` (measured ~9:1 ratio for nice 0 vs 10).

## 4. Context switches: voluntary vs involuntary

A **context switch** swaps the running task: save registers/stack/FPU,
`switch_mm` (new page tables → `cr3` + TLB consequences, §10), restore the
next task, resume. Cost: ~1–3µs direct, more in cache/TLB damage. Two kinds:

| Kind | Trigger | Counter | Example |
|------|---------|---------|---------|
| **Voluntary** | task *gives up* the CPU (sleeps, waits, blocks) | `ru_nvcsw` | `sleep`, `read` on empty pipe, `waitpid` |
| **Involuntary** | kernel *takes* the CPU (timeslice over, higher-prio wakeup) | `ru_nivcsw` | spinner sharing a CPU, preempted |

Both are readable per process: `getrusage(RUSAGE_SELF, …)` gives
`ru_nvcsw`/`ru_nivcsw`, and `/proc/<pid>/status` has
`voluntary_ctxt_switches` / `nonvoluntary_ctxt_switches`.

▶ **Code:** `code/ctxcount.c` — `spin` mode racks up **involuntary**
switches (the kernel preempts you); `sleep` mode racks up **voluntary** ones
(you keep yielding). The numbers make the distinction physical.

## 5. Preemption: who interrupts whom

- **Tick-driven**: `CONFIG_HZ` timer interrupts (usually 250–1000Hz) call the
  scheduler; if current's slice expired → `need_resched` → switch at the
  next opportunity. (`CONFIG_NO_HZ` omits ticks for lone tasks — "tickless".)
- **Wakeup-driven**: a sleeping task's event arrives (packet! keypress!
  lock!) → if it outranks current → **immediate preemption**. This is why
  interactive tasks feel instant: they preempt spinners the moment they wake.
- **Kernel preemption**: even kernel code (outside locks/interrupt context)
  can be preempted on most builds (`PREEMPT_DYNAMIC`, seen in our `uname`).
  RT kernels (`PREEMPT_RT`) push this to nearly everywhere — bounded latency.

▶ **Experiment 03** shows wakeup preemption indirectly: the pinned spinner's
`nr_switches` climbs while a `sleep`-loop task keeps stealing the CPU.

## 6. Priorities you can actually touch

| Knob | Range | Who can set it | Tool/syscall |
|------|-------|----------------|--------------|
| `nice` | -20 (high) … 19 (low), default 0 | anyone can *raise* (lower prio); lowering needs privilege (`CAP_SYS_NICE`, modulo `RLIMIT_NICE`) | `nice`, `renice`, `getpriority/setpriority` |
| RT policy+prio | `SCHED_FIFO/RR` prio 1–99 | privileged only | `chrt`, `sched_setscheduler` |
| CPU affinity | subset of CPUs | anyone (for own tasks) | `taskset`, `sched_setaffinity` |
| (cgroups) CPU shares/quota | — | whoever owns the cgroup | §26 |

▶ **Code:** `code/sched_info.c` — prints your own policy, `nice`, RT
priority, and affinity mask… then *tries* to go RT and shows you the `EPERM`.
(The §02 wall, in scheduling form.)

## 7. Observing the scheduler (your toolkit)

| Question | Ask |
|----------|-----|
| Who's eating CPU? | `top`, `ps -eo pid,ni,stat,time,comm --sort=-%cpu \| head` |
| Which CPU is a task on? | `ps -o pid,psr,stat,cmd` (`PSR` = current CPU) |
| Class/policy/prio? | `ps -o pid,cls,rtprio,ni,pri,cmd`, `chrt -p <pid>` |
| Switch counts? | `grep ctxt /proc/<pid>/status`, `getrusage` |
| vruntime/slices? | `/proc/<pid>/sched`, `/proc/<pid>/schedstat` |
| System-wide switches? | `vmstat 1` (`cs` column), `/proc/schedstat` |
| How long did MY program run? | `time ./prog` (real/user/sys — §35 dissects these) |
| Load average? | `uptime` — runnable + uninterruptible averaged (see notes) |

▶ **Reference:** [notes/load-and-time.md](notes/load-and-time.md) — what load
average *really* counts, and how to read `time` output.

---

## Experiments

```bash
cd experiments/
./01-fairness.sh          # two pinned spinners → (near-)equal CPU shares
./02-nice-matters.sh      # nice 0 vs 10 → ~9:1 ratio + RT EPERM demo
./03-see-preemption.sh    # voluntary vs involuntary switches, live
```

## Build the code

```bash
cd code/
make
./sched_info
./spinner 2
./ctxcount spin 2
./ctxcount sleep 2
```

## Exercises

1. Pin THREE spinners to one CPU (`taskset -c 0`) with nices 0, 5, 10.
   Predict each one's CPU share from the weight table (1024 / 335 / 110),
   then measure with `time`. How close is CFS to theory?
2. `grep -E 'se.(vruntime|sum_exec_runtime)|nr_switches' /proc/self/sched`
   runs in a fresh shell each time — instead, watch ONE process: start
   `sleep 300 &`, note its vruntime, burn CPU elsewhere, and check whether
   the sleeper's vruntime moved. Why (not)?
3. `chrt -f 1 ./spinner 1` as non-root: what error? Now explain *why* the
   kernel refuses — what damage could an unprivileged FIFO task do?
   (Answer in §2, verify empirically with `sudo` ONLY if you have a spare
   machine/VM — a runaway FIFO task needs SysRq/kill from another console.
   Label: dangerous, do it in a VM.)
4. Run `./ctxcount spin 3` alone, then alongside `stress`-like load
   (3 background spinners). How do involuntary switches scale with
   contention? (Preview of §35: contention is measurable.)
5. `cat /proc/schedstat` twice, 5s apart. Which counters moved, and what do
   they count? (`Documentation/scheduler/sched-stats.rst` in kernel source.)

## Further reading (in this track)

- Next: [07 — Signals](../07-signals/) — the kernel's other per-task
  mechanism: async notifications, masks, and why `kill -9` always works
  (except in `D` — §04).
- Reference: [notes/sched-classes.md](notes/sched-classes.md),
  [notes/load-and-time.md](notes/load-and-time.md).
- Diagrams: [diagrams/schedule-flow.md](diagrams/schedule-flow.md).
