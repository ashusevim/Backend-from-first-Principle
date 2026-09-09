# 05 — Process Creation

**Question this section answers:** *Where do processes come from — and what
exactly happens, inside the kernel, between typing a command and seeing its
output?*

By the end you can: trace `fork`+`exec`+`wait` as a kernel-level flow, explain
why **one** syscall (`clone`) underlies processes, threads, AND containers,
predict when zombies and orphans appear — and you will have written a working
shell.

---

## 1. The Unix way: two steps where one would do

Most systems spawn a process in one call ("create X running program Y").
Unix splits it in two:

1. **`fork()`** — duplicate *me*: the child is a near-copy of the parent
   (same code, same memory contents, same fds), differing only in PID, PPID,
   and a few reset fields. Returns **twice**: the child's PID to the parent,
   `0` to the child.
2. **`execve(path, argv, envp)`** — *become* another program: discard my
   address space and load a fresh one from an ELF file. Returns only on
   failure (success never comes back — there is no "back").

Then the parent collects the result with **`waitpid()`**.

Why split? Because the gap between `fork` and `exec` is programmable: the
shell `dup2`s fds there (redirection, §08), changes directory, adjusts
signals and limits, joins namespaces (§25) — customizing the child *before*
it becomes the new program. One monolithic "spawn" call would need infinite
options; `fork`+`exec` needs none. That gap is where shells, `sudo`,
containers, and daemonizers all do their work.

```text
bash                         kernel                         new program
────                         ──────                         ───────────
fork() ─────────────────▶ copy task_struct + mm (CoW!) +
                          files + cred; assign PID;
                          put child on runqueue
   │                         │
   ├─ returns 1235           ├─ returns 0
   │ (parent)                │ (child)
   │                         │ dup2() pipes here! (§08)
   │                         │ chdir(), setuid()... (§23)
waitpid(1235) ───sleeps──▶   │ execve("/bin/ls",...) ──▶ discard old mm,
   │                         │                           load ELF, fresh stack
   │                    ◀────│ exit_group(0)             with argv/envp (§12)
   ◀─ returns 1235,     reaps zombie, hands
      status 0          exit code to parent
```

▶ **Diagrams:** [diagrams/fork-exec-flow.md](diagrams/fork-exec-flow.md) —
each arrow expanded. ▶ **Code:** `code/fork_demo.c` — the smallest program
that returns twice.

> **Gotcha (demonstrated live in the code):** `fork` copies the stdio
> *buffers* too. Flush before forking (`fflush(stdout)`), and end forked
> children with `_exit`, not `exit` — `exit` flushes the *copied* buffers a
> second time (duplicate output), while `_exit` flushes nothing (so flush
> your own lines first). On a terminal you won't notice (line-buffered);
> through a pipe, you lose output. All three demos do this correctly.

## 2. `fork`: what the child inherits (and doesn't)

`fork` duplicates generously — then resets a deliberate few:

| Inherited (copied/shared) | NOT inherited (fresh/reset) |
|---------------------------|-----------------------------|
| memory contents (**copy-on-write** — pages shared read-only until either side writes; §11) | PID (new), PPID (= parent's PID) |
| fd table (**same open files**, shared offsets! — §08) | pending signals (cleared), file locks (dropped) |
| signal handlers + masks | `tms` CPU timers (reset) |
| cwd, root, umask, limits, namespaces, cgroup | `vfork`-era horrors (below) |

Two rows deserve emphasis now:

- **Shared fd offsets** bite constantly: parent and child writing the same fd
  interleave through ONE offset. (Section 08 demo.)
- **Copy-on-write** is why `fork` is cheap: no memory is copied at `fork`
  time — only page *tables*. The copy happens lazily, per page, on first
  write. `fork`+immediate-`exec` (the shell's pattern) copies ~nothing.

## 3. `clone`: the one primitive to rule them all

`fork` is not fundamental. On Linux, **everything** is `clone()` with
different flags:

```c
fork()  = clone(SIGCHLD, ...)                       // nothing shared
pthread_create() = clone(CLONE_VM | CLONE_FS | CLONE_FILES |
                         CLONE_SIGHAND | CLONE_THREAD | ..., child_stack)
                    // share memory, fds, handlers: a THREAD (§14)
unshare(CLONE_NEWPID) / container spawn = clone( ... | CLONE_NEWPID |
                         CLONE_NEWNS | CLONE_NEWNET | ...)  // (§25, §27)
```

Read that twice: **processes, threads, and containers differ only in which
`clone` flags they pass.** `fork` shares nothing; threads share (almost)
everything; containers share everything *except* the namespaces they isolate.
This is the single most unifying idea in Linux process management.

▶ **Reference:** [notes/clone-flags.md](notes/clone-flags.md) — the flag
table and the fork/thread/container recipes.

### And `vfork`?

History lesson: before CoW, `fork` copied all memory — brutally expensive
before an immediate `exec`. `vfork` was the hack: child borrows the parent's
memory AND stack, parent frozen until `exec`/`_exit`. Dangerous (any write
corrupts the parent), now obsolete on Linux (CoW made `fork` cheap;
`posix_spawn` covers the remaining fast-path). Know it exists; never use it.

## 4. `execve`: becoming someone else

`execve` keeps the PID, PPID, PID-namespace membership, open fds (except
`CLOEXEC` ones — §08), signal *masks*… and replaces everything else: new
`mm_struct`, fresh stack with `argv`/`envp`, reset signal *handlers* (old
handlers would point into the dead image!). Details of the ELF load are
Section 12; the process-level facts that matter now:

- **Fds survive exec** (unless `O_CLOEXEC`/`FD_CLOEXEC`) — this is HOW
  redirection works: the shell sets up fds 0/1/2, then `exec`s; the program
  never knows. (§08)
- **Setuid happens here**: if the binary has the setuid bit, `execve`
  elevates EUID. (§23)
- `argv[0]` is just a string the parent chose — conventionally the program
  name, but `exec -a fakename` can lie. (`ps` shows what it was told.)

## 5. `wait`: the reaping, and what happens without it

When a process dies, most of it is freed — except the exit status, which must
survive until the parent collects it. The in-between object is the **zombie**
(§04): a PID slot + an integer, nothing else. `waitpid` collects it:

```c
int status;
pid_t p = waitpid(child, &status, 0);   // sleep until child changes state
if (WIFEXITED(status))   printf("exit %d\n", WEXITSTATUS(status));
if (WIFSIGNALED(status)) printf("signal %d%s\n", WTERMSIG(status),
                                WCOREDUMP(status) ? " (core dumped)" : "");
```

▶ **Reference:** [notes/wait-status.md](notes/wait-status.md) — every macro
and option, plus the `EINTR`-retry rule.

### Zombies: children nobody collected

Parent alive + never `wait`s → dead children pile up as `Z`. Harmless
individually (no memory/fds), harmful in bulk (PID exhaustion — `fork` starts
failing with `EAGAIN`). Cure: reap (`wait`), or die (below).

▶ **Code + experiment:** `code/zombie.c` + `experiments/02-zombie-orphan-lab.sh`
— watch `Z` / `<defunct>` appear in `ps`, then get reaped.

### Orphans: parents that died first

A process must ALWAYS have exactly one parent — so when the parent dies, the
kernel **reparents** its children to the nearest alive *subreaper* (a process
that marked itself with `prctl(PR_SET_CHILD_SUBREAPER)`) or to PID 1, which
reaps relentlessly. Orphaned process groups also get `SIGHUP`+`SIGCONT`
(that's why background jobs die on logout unless `nohup`ed/`disown`ed).

▶ **Code:** `code/orphan.c` — prints PPID before and after the parent exits;
watch it jump.

### The double-fork daemon (classic recipe, 30 seconds)

Old-school daemons detach via: `fork` → parent exits → child `setsid()`
(new session, no terminal) → `fork` again → parent exits → grandchild can
never reacquire a terminal. Modern systems use `systemd` (§30) instead — but
you'll still read this pattern in old code, and now you know what each fork
is for.

## 6. Capstone: `minish`, a real (tiny) shell

Everything above composes into the program you've been using all along:

```text
loop:
  print prompt → read line → split into argv
    ├─ builtin?  cd → chdir() on OURSELVES   (§01: why cd can't be external)
    │            exit → goodbye
    └─ external? fork()
                   ├─ child:  execvp(argv[0], argv)  (searches PATH)
                   │          on failure: perror + _exit(127)
                   └─ parent: foreground → waitpid + report status/signal
                              background (&) → print [pid], reap later (WNOHANG)
```

▶ **Code:** `code/minish.c` (~150 lines): prompt, `cd`/`exit` builtins,
`PATH` search, foreground + `&` background jobs, exit-status/signal
reporting. Run it interactively AND scripted
(`experiments/03-minish-session.sh`).

After this, `bash` holds no mystery at its core: it's this loop, plus job
control, plus redirection (§08), plus pipes (§17), plus 40 years of features.

---

## Experiments

```bash
cd experiments/
./01-fork-wait-lab.sh        # fork_demo: one call, two returns
./02-zombie-orphan-lab.sh    # Z in ps, then reaped; PPID jump on orphaning
./03-minish-session.sh       # scripted minish run: builtins, bg jobs, failures
```

## Build the code

```bash
cd code/
make
./fork_demo
./zombie 5          # 5s of zombie-hood, then reaped (status 42)
./orphan            # watch PPID jump
./minish            # your shell. try: /bin/echo hi, cd /tmp, sleep 1 &
```

## Exercises

1. `./zombie 30 &`, then in another shell `ps -o pid,ppid,stat,cmd -p <child>`.
   Explain all four columns. What happens to the zombie when you `kill` the
   parent? Verify.
2. Trace `./fork_demo` with Section 03's `mini-strace` (path:
   `../../03-system-calls/code/mini-strace` — build it if needed). Find the
   `clone`, and explain why you see output lines from "two" processes but
   only ONE `execve`.
3. Add `export`/`unset` builtins to `minish` (hint: `setenv`/`unsetenv` —
   and explain why they must be builtins, like `cd`).
4. Add output redirection (`cmd > file`) to `minish` (preview of §08 — you'll
   need `open` + `dup2` in the child before `exec`). If you get stuck, wait
   for Section 08 and come back.
5. `setsid ./orphan` — how does the reparenting target change? (Discover your
   init/subreaper setup empirically.)
6. (Think) Why can't `waitpid` collect a process that isn't your child?
   What would break if it could? (Exit statuses are parent-private; also:
   who would the zombie's parent BE?)

## Further reading (in this track)

- Next: [06 — Process Scheduling](../06-process-scheduling/) *(coming soon)* —
  who runs when, `nice`, preemption, and measuring it.
- Reference: [notes/clone-flags.md](notes/clone-flags.md),
  [notes/wait-status.md](notes/wait-status.md).
- Diagrams: [diagrams/fork-exec-flow.md](diagrams/fork-exec-flow.md).
