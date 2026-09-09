# 07 — Signals

**Question this section answers:** *How does the kernel (or another process)
tap a running process on the shoulder — asynchronously, mid-whatever-it-was-
doing — and what happens inside when it lands?*

By the end you can: explain delivery (pending → mask check → handler frame on
return to user space), write async-signal-safe handlers (the flag pattern),
account for every `kill` variant, and say exactly why `SIGKILL`/`SIGSTOP` are
unblockable.

---

## 1. What a signal is (and isn't)

A signal is a **numbered asynchronous notification** to a process (or thread,
or process group). "Asynchronous" is the whole game: it can land between any
two instructions — inside a syscall, mid-`malloc`, anywhere. The kernel's
contract:

1. **Send**: `kill(pid, sig)` (a syscall — the §02 gate; permission-checked:
   same UID, or privileged, with init exempting itself) marks the signal
   **pending** on the target. Other senders: the terminal driver (`Ctrl-C` →
   `SIGINT` to the foreground *group*), the CPU itself (`SIGSEGV` on a bad
   access — a *synchronous* signal, §4), the kernel (`SIGCHLD` on child
   state change, `SIGHUP` on orphaned groups §05).
2. **Mask check**: each thread has a **signal mask** (blocked set). Blocked =
   stays pending — visible in `/proc/<pid>/status` as `ShdPnd` (process-
   directed, e.g. from `kill()`) or `SigPnd` (thread-directed, e.g. from
   `pthread_kill`). Unblocked = delivered at the next opportunity.
3. **Delivery**: on the next **return to user space** (syscall exit, interrupt
   return), the kernel notices `TIF_SIGPENDING` and acts: default action,
   ignore, or run your **handler** (a user function the kernel calls by
   building a stack frame — then resumes where you were).

Standard signals (1–31) don't queue: 50 pending `SIGINT`s collapse into one.
Realtime signals (32–64, `SIGRTMIN`–`SIGRTMAX`) queue with data (`sigqueue`).

▶ **Reference:** [notes/signal-table.md](notes/signal-table.md) — all 31,
with defaults and origins.

## 2. The signals you must know cold

| Signal | # | Default | From | Meaning |
|--------|---|---------|------|---------|
| `SIGKILL` | 9 | **Term** | `kill -9` | die NOW. **Uncatchable, unblockable, unignorable** — the kernel kills without asking user code. (Caveat: `D`-state defers it, §04.) |
| `SIGSTOP` | 19 | **Stop** | `kill -STOP`, (never the terminal) | suspend NOW. Equally unblockable — the scheduler just deschedules you. |
| `SIGTERM` | 15 | Term | `kill`, `killall`, shutdown | "please exit" — catchable: clean up and die. Always try before `-9`. |
| `SIGINT` | 2 | Term | `Ctrl-C` (terminal → foreground group) | "interrupt what you're doing" — shells/programs often catch (abort line, not process). |
| `SIGQUIT` | 3 | **Core** | `Ctrl-\` | like INT but dumps core (§36) — "die AND leave evidence". |
| `SIGTSTP` | 20 | Stop | `Ctrl-Z` | "please suspend" (catchable — `vim` uses it to redraw on resume). |
| `SIGCONT` | 18 | Cont | `fg`, `kill -CONT` | resume a stopped process (also: discards a pending `SIGSTOP`!). |
| `SIGHUP` | 1 | Term | logout, orphaned group (§05) | "your terminal is gone" — daemons catch it as "reload config". |
| `SIGCHLD` | 17 | Ign | kernel, on child stop/exit | "reap me" — the wait-notification (§05). `SIG_IGN` = auto-reap! |
| `SIGPIPE` | 13 | Term | kernel, on write to a read-closed pipe | "nobody's listening" — why `yes \| head` doesn't fill the disk (§17). |
| `SIGSEGV` | 11 | Core | CPU fault (yours!) | bad memory access — you faulted, the kernel translates it into a signal *to yourself*. |
| `SIGUSR1/2` | 10/12 | Term | `kill` by convention | user-defined — daemons use for reload/rotate/dump. |
| `SIGALRM` | 14 | Term | `alarm`/`setitimer` expiry | timers (§30 uses them; profilers abuse them). |
| `SIGWINCH` | 28 | Ign | terminal resize | "redraw" — ignored unless the program cares. |

Why are `KILL`/`STOP` uncatchable? Because the alternative is a process that
can't be stopped — malware's dream and ops' nightmare. The kernel enforces
it: `sigaction(SIGKILL, …)` returns `EINVAL`, and the mask silently drops
both bits. The kill switch must ALWAYS work (modulo `D`).

> **Race we hit while writing this section:** `sleep 60 & kill -STOP $!`
> sometimes stops the child *between fork and exec* — `ps` then shows the
> parent's command line (`bash …`) in state `T`, and only after `CONT` does
> it become `sleep`. The signal is delivered to the *task*, whatever image
> it currently runs. (Experiment 01 sleeps 0.2s first to let `exec` win.)

## 3. Dispositions: default, ignore, catch

Per signal, per process: `SIG_DFL` (the table's default), `SIG_IGN` (drop
it — except `KILL`/`STOP`), or a **handler function** installed with
**`sigaction`** (never `signal()` — its semantics varied across Unixes;
`sigaction` is explicit and portable).

What running a handler actually means:

```text
you, mid-syscall (e.g. read() sleeping)         a SIGUSR1 lands
   │                                                   │
   │◀── kernel: mark pending, wake you ────────────────┘
   │
   ├── syscall ABORTS with EINTR (unless SA_RESTART — see below)
   │
   ▼── return-to-user path: TIF_SIGPENDING set ──▶ kernel builds a frame
                                                   on YOUR stack and calls
                                                   handler(signo)
                                                      │
   ◀── sigreturn ─────────────────────────────────────┘
   │
   ▼── resume after the syscall (errno=EINTR) or restart it
```

Three rules that bite everyone once:

1. **Handlers must be async-signal-safe.** The handler interrupts arbitrary
   code — possibly mid-`malloc` (lock held!). Calling `printf`/`malloc`/
   most of libc from a handler can deadlock or corrupt. The safe pattern:
   set a `volatile sig_atomic_t` flag (or `write()` to a pipe — §21's
   self-pipe trick) and do the real work in normal code.
   ▶ [notes/async-safety.md](notes/async-safety.md) + `code/sigdemo.c` (the
   flag pattern, done right).
2. **Slow syscalls fail with `EINTR`** when a handler runs — unless installed
   with `SA_RESTART` (auto-restart `read`/`write`/`wait`/… — but never
   `sleep`/`pause`/`sigtimedwait`). That's why §05's minish retries
   `waitpid` on `EINTR`.
3. **Returning from a *synchronous* handler re-runs the fault.** Catch
   `SIGSEGV` and return → the faulting instruction executes again → `SIGSEGV`
   again → infinite loop. Sync handlers must `_exit`, `longjmp`, or fix the
   cause (`mprotect` + return is the GC/JIT page-fault trick, §10 preview).
   ▶ `code/fault.c` demonstrates catch-print-`_exit`.

## 4. Masks and pending: signals wait politely (if told to)

`sigprocmask(SIG_BLOCK, …)` adds to the mask; the signal then waits in
`pending` until unblocked — delivery order preserved, standard signals merged.
Inspect live: `SigBlk`/`SigPnd`/`ShdPnd`/`SigCgt` in `/proc/<pid>/status`
(bitmasks! `kill`-sent signals land in `ShdPnd` while blocked).

▶ **Code:** `code/sigblock.c` — blocks `INT`+`TERM`, shows you `SigPnd`
filling while you `kill` it, then unblocks and watches both handlers fire.
This is the mask/pending/delivery cycle made visible.

Related tools: `sigpending()` (query your own pending set), `sigsuspend()`
(atomically unblock + sleep — the race-free "wait for a signal"),
`pthread_sigmask()` (per-thread masks — signals are delivered to exactly one
thread that doesn't block them, §14), `signalfd()` (read signals as fd
events — §21's favorite).

## 5. `kill`: the world's worst-named syscall

`kill(pid, sig)` **sends** a signal — killing (with `SIGKILL`) is one of 64
options. The variants:

| Form | Sends to |
|------|----------|
| `kill(pid, s)` / `kill <pid>` | that process (default signal: `TERM`) |
| `kill(0, s)` | your whole process GROUP |
| `kill(-pgid, s)` / `kill -- -<pgid>` | that process group (job control's hammer) |
| `kill(-1, s)` | EVERY process you may signal (root: literally all — the shutdown path!) |
| `kill(pid, 0)` | NOBODY — signal 0 tests existence + permission (exit 0 = you could signal it) |
| `killall/ pkill` | by NAME (procps matches `/proc` — §22) |

Permissions: same real/effective UID (or `CAP_KILL`), and you can't send to
PID 1 from inside… precisely: the kernel gives init special immunity (it only
receives signals it installed handlers for — accidental `kill -9 1` from a
container must not murder the host's init; §25, §27).

## 6. The full picture

```text
sender: kill() │ Ctrl-C │ CPU fault │ kernel event
   │                (permission-checked at the §02 gate)
   ▼
target->pending |= bit ──▶ masked? ──yes──▶ waits (SigPnd; merged if standard)
   │                              └── no ──▶ next return-to-user:
   │                                                   │
   │                              ┌────────────────────┼────────────────────┐
   │                              ▼                    ▼                    ▼
   │                           SIG_DFL:            SIG_IGN:             handler:
   │                           Term/Core/Stop     drop it              build frame,
   │                           /Cont/Ign                               call it (async-
   │                                                                   safe ONLY),
   │                                                                   sigreturn
   ▼
KILL/STOP skip everything: no mask, no handler, no negotiation
```

---

## Experiments

```bash
cd experiments/
./01-signal-tour.sh       # kill -l, TERM vs KILL, signal-0 probe, survival test
./02-pending-lab.sh       # blocked signals pile in SigPnd, then deliver
./03-handler-lab.sh       # USR1/INT/TERM against a flag-pattern program
```

## Build the code

```bash
cd code/
make
./sigdemo & S=$!; sleep 0.2; kill -USR1 $S; sleep 0.2; kill -INT $S; sleep 0.2; kill -TERM $S; wait $S
./sigblock            # in another shell: kill -INT <pid>, kill -TERM <pid>
./fault; echo "exit: $?"
```

## Exercises

1. `strace -e trace=%signal` doesn't exist on mini-strace — instead: run
   `./sigdemo`, note `SigCgt` in `/proc/<pid>/status`, decode which bits are
   set (bit `n` = signal `n`). Compare before/after sending `SIGUSR1`.
2. `kill -STOP $$` in an interactive shell. What happens? How do you recover?
   (Another shell + `kill -CONT`.) Why can't the stopped shell help itself?
3. Write the `Ctrl-C-during-minish` story: you press `Ctrl-C` in `./minish`
   while `sleep 100` runs. Which processes get `SIGINT`? (Foreground GROUP:
   minish AND sleep.) What does each do by default? What SHOULD minish do
   (§07 reading: ignore `SIGINT` while a child runs, like real shells)?
   Implement it — 5 lines with `sigaction`.
4. `trap '' TERM` then `kill -TERM <shell>` vs `kill -KILL <shell>`: verify
   the first is survivable, the second isn't. (Experiment 01 scripts this —
   now do it by hand and explain the `trap` builtin in handler terms.)
5. Why does `yes | head -1` terminate instead of running forever? (Answer:
   `head` exits → pipe has no readers → `yes`'s next `write` gets `SIGPIPE`
   → default Term. Full story §17 — but predict it NOW from this section.)
6. (Think) A handler sets a flag; main loop checks it. Why `volatile
   sig_atomic_t` and not plain `int`? (Two reasons: `volatile` stops the
   compiler caching it in a register across the check; `sig_atomic_t` =
   read/written in one instruction — no torn reads. §15 makes this rigorous.)

## Further reading (in this track)

- Next: [08 — File Descriptors](../08-file-descriptors/) *(coming soon)* —
  the fd → file → inode chain, `dup2`, and shell redirection by hand.
- Reference: [notes/signal-table.md](notes/signal-table.md),
  [notes/async-safety.md](notes/async-safety.md).
- Diagrams: [diagrams/delivery-flow.md](diagrams/delivery-flow.md).
