# 04 — Processes

**Question this section answers:** *What IS a process — not "a running program"
hand-waving, but the actual kernel object, its fields, its states, and how I
inspect every one of them?*

By the end you can: explain `task_struct` field by field, decode any `ps STAT`
column at a glance (including why `D` ignores `SIGKILL`), walk your own
ancestry to PID 1, and read `/proc/<pid>` like a dashboard.

---

## 1. A process is a kernel object (plus resources)

"A running program" misses the point. A process is:

1. **One `task_struct` in the kernel** — the process's identity card and
   control block (~2 pages of fields: ids, state, scheduling info, pointers
   to everything below).
2. **An address space** (`mm_struct`): code, heap, stack, libraries — what the
   process can "see". (Sections 10–11.)
3. **An open-file table** (`files_struct`): fds 0, 1, 2, … (Section 08.)
4. **Credentials** (`cred`): UID/GID/capabilities — what it's *allowed* to do.
   (Section 23.)
5. **Signal state, timers, namespaces, cgroup membership…** (Sections 07, 25, 26.)

```text
kernel memory                          what YOU see
─────────────                          ────────────
┌──────────────┐  pid, ppid, state  ┌─────────────────┐
│ task_struct  │ ─────────────────▶ │ ps, /proc/<pid> │
│  ├─ mm ──────┼── address space ──▶│   /status       │
│  ├─ files ───┼── fd table ───────▶│   /maps  (§10)  │
│  ├─ cred ────┼── uid/gid ────────▶│   /fd    (§08)  │
│  ├─ parent ──┼── hierarchy ──────▶│   /status (Uid:)│
│  └─ signal   │                    │   pstree (§05)  │
└──────────────┘                    └─────────────────┘
```

Key insight: **user space never sees `task_struct` directly** — only the
renderings the kernel chooses to expose (`/proc`, syscalls like `getpid`).
Two consequences you'll verify today: (a) `ps` is just a `/proc` formatter
(Section 22 proves it by reimplementing it); (b) some fields are deliberately
hidden from you (other users' `environ`, anyone's `mem` — Section 02's wall).

▶ **Diagrams:** [diagrams/task-struct.md](diagrams/task-struct.md) — the full
field map with the `/proc` file for each.

## 2. Identity: PID, PPID, and the family tree

- **PID** — the process's number. Unique (at any moment), allocated
  sequentially, wrapping at `/proc/sys/kernel/pid_max` (default 4194304).
  PID 0 is the idle/swapper task (not a real process), PID 1 is `init`
  (`systemd` usually — Sections 29–30), PID 2 is `kthreadd` (father of all
  kernel threads).
- **PPID** — who created you (`fork`, Section 05). If your parent dies first,
  you are **reparented** — adopted by the nearest "subreaper" or PID 1.
  (Orphans, zombies, and `wait` are all Section 05; the mechanism to remember:
  *a process always has exactly one parent.*)
- **PGID / SID** — process group and session: job control (`Ctrl-C` signals
  the whole *group*; the shell puts each pipeline in its own). Preview now,
  full story in Sections 05 + 07.

▶ **Code:** `code/ppid_chain.c` — walks from your PID up the PPID chain to
PID 1 by parsing `/proc/<pid>/stat`. Run it: you are looking at your own
lineage (shell → terminal/sshd → … → init).

```text
./ppid_chain ──ppid──▶ bash ──ppid──▶ sshd ──ppid──▶ systemd (PID 1)
```

## 3. State: what the process is doing RIGHT NOW

The `State:` line in `/proc/<pid>/status` (and `ps`' `STAT` column) shows one
letter. This is the scheduler's view of you:

| Letter | Name | Meaning |
|--------|------|---------|
| `R` | running/runnable | on a CPU, or waiting for one (runqueue) |
| `S` | sleeping | waiting for an event; **killable** (most processes, most of the time) |
| `D` | disk sleep | **uninterruptible** sleep — usually inside a driver; even `SIGKILL` waits |
| `I` | idle | kernel-thread parking state (like `S`, but doesn't count toward load average) |
| `T` | stopped | suspended by `SIGSTOP`/`SIGTSTP` (job control: `Ctrl-Z`) or by a tracer |
| `t` | tracing stop | stopped by the debugger while tracing (you saw this in `mini-strace`!) |
| `Z` | zombie | dead, but the parent hasn't `wait()`ed — only the exit code remains |
| `X`/`x` | dead | dying/dead — you essentially never observe these |
| `K`/`W`/`P` | wakekill/parked | rare kernel-thread states — know they exist, move on |

Plus `ps` appends modifiers: `<` high priority, `N` low (`nice`), `L` has
locked pages, `s` session leader, `l` multithreaded, `+` in the foreground
process group. So `Ssl+` = sleeping, session leader, multithreaded,
foreground — a totally normal daemon-ish shell program.

**Why is `D` unkillable?** The process is inside a syscall, holding kernel
resources (say, waiting on a disk that will never answer). Killing it there
would corrupt kernel state, so the kernel *defers* your `SIGKILL` until the
process leaves `D`. If the driver never wakes up → famous unkillable process,
fixable only by fixing the I/O (or rebooting). Modern kernels convert many
waits to `TASK_KILLABLE` (still shows as `D`, but fatal signals *do* break
it) — same letter, better behavior.

▶ **Experiment:** `experiments/02-states-in-action.sh` — puts real processes
into `S`, `R`, and `T` and shows you each one live.

## 4. `/proc/<pid>`: the dashboard

Every process gets a directory. The greatest hits (full map in
[notes/proc-pid-map.md](notes/proc-pid-map.md)):

| File | Shows | Try |
|------|-------|-----|
| `status` | human-readable identity + state + memory summary | `head -20 /proc/$$/status` |
| `stat` | same data, machine-readable, ONE line (what `ps` parses!) | `cat /proc/$$/stat` |
| `cmdline` | argv, NUL-separated (exactly what `execve` got) | `tr '\0' ' ' < /proc/$$/cmdline` |
| `environ` | envp, NUL-separated (yours only — others are hidden!) | `tr '\0' '\n' < /proc/$$/environ \| head` |
| `exe` | symlink → the actual binary (deleted? shows `(deleted)`) | `ls -l /proc/$$/exe` |
| `cwd`, `root` | symlinks → working dir, filesystem root ( basis of `chroot`) | `ls -l /proc/$$/cwd` |
| `fd/` | the fd table as symlinks (Section 08 lives here) | `ls -l /proc/$$/fd` |
| `maps` | the address space, VMA by VMA (Section 10 lives here) | `cat /proc/$$/maps \| head` |
| `task/` | one subdir per THREAD (each thread is a task! Section 14) | `ls /proc/$$/task` |
| `stack` | current KERNEL stack trace (your own is readable!) | `cat /proc/$$/stack` |

▶ **Experiment:** `experiments/01-tour-proc-pid.sh` — guided tour of your
shell's own entry. ▶ **Code:** `code/procself.c` — parses `/proc/self/stat`
(including the classic `comm`-in-parentheses gotcha) and prints the fields
with their meanings.

## 5. Threads are processes (sneak preview)

`ls /proc/$$/task` on a multithreaded program shows multiple entries — each
with its own `task_struct`, its own TID, its own state. **On Linux, a thread
is just a task that shares its address space** (created by `clone` with
`CLONE_VM`, Section 05). PID vs TID vs TGID:

- **TGID** = thread-group ID = "the PID" as you know it (`getpid()`).
- **TID** = the task's own ID (`gettid()`); the group leader's TID == TGID.
- Plain `ps` shows one line per TGID; `ps -T`/`-L` shows every TID.

That's all you need now — Section 14 builds the full picture.

## 6. The full picture

```text
fork() ... or rather, BEING a process means the kernel tracks, per task:
────────
task_struct:  pid/tgid ┬ state ┬ prio/policy ┬ parent/children ┬ exit_code
                       │       │             │                 │
                       ▼       ▼             ▼                 ▼
                    /proc:  status/stat ── ps aux ── top ── htop
                              │                  (all formatters;
                    ┌──────────┼──────────┐       kernel owns truth)
                    ▼          ▼          ▼
                  mm ──▶ maps/memmory   files ──▶ fd/   cred ──▶ Uid:/Gid:
                 (§10)                   (§08)           (§23)
```

---

## Experiments

```bash
cd experiments/
./01-tour-proc-pid.sh        # guided tour of /proc/$$ (your own shell!)
./02-states-in-action.sh     # S, R, T states on demand (self-cleaning)
./03-inspect-yourself.sh     # builds code/, cross-checks vs ps
```

## Build the code

```bash
cd code/
make
./procself
./ppid_chain
```

## Exercises

1. `cat /proc/self/stat` twice in a row (two separate commands). Which fields
   change? Why? (PID, starttime, utime/stime… — each `cat` is a NEW process.)
2. Run `sleep 100 &`, then `cat /proc/$!/status | head -3` and
   `ls -l /proc/$!/fd`. Kill it. Now explain every line you saw.
3. Find a `D`-state process on your machine (`ps aux | awk '$8 ~ /D/'`).
   Usually none — good. What kind of workload produces them? (Stuck NFS,
   dying disks, some virtualization paths.)
4. `ps -o pid,ppid,pgid,sid,stat,cmd -p $$` — decode every column for your
   shell. What are its PGID and SID, and why are they equal (or not)?
5. (Preview of §05) Run `(sleep 30 &)` — a background job in a subshell that
   exits immediately. Who is the sleeper's parent now? (`ps -o pid,ppid,cmd`
   to check.) You just made an orphan.

## Further reading (in this track)

- Next: [05 — Process Creation](../05-process-creation/) — `fork`/`exec`/
  `wait`, orphans, zombies, and your own mini-shell.
- Reference: [notes/proc-pid-map.md](notes/proc-pid-map.md),
  [notes/process-states.md](notes/process-states.md).
- Diagrams: [diagrams/task-struct.md](diagrams/task-struct.md).
