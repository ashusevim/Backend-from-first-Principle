# Diagrams — Signal lifecycle

## Send → pend → mask → deliver

```text
sender                          KERNEL                          target thread
──────                          ──────                          ─────────────
kill(pid, SIGUSR1) ──syscall──▶ permission check (same uid? CAP_KILL?)
                                init immunity? (pid 1: handler or nothing)
                                         │
                                         ▼
                                pending bit set ──▶ masked? ──yes──▶ STAYS
                                 (standard: merged;              pending
                                  rt: queued)                   (SigPnd++)
                                         │ no
                                         ▼
                                TIF_SIGPENDING ──▶ next return-to-user:
                                                   syscall exit / irq return
                                                   / context switch to us
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
                 SIG_DFL              SIG_IGN             handler installed
              Term/Core/Stop/       drop silently       build frame on OUR stack:
               Cont/Ign             (KILL/STOP          push siginfo, call handler()
                                     can't be here)            │
                                                              ▼
                                                     handler runs (SAFE calls
                                                     only!) then sigreturn
                                                              │
                                                              ▼
                                                     resume interrupted code
                                                     (syscall: EINTR or restart)
```

## The uncatchable two (why KILL/STOP skip the diagram)

```text
kill -9 pid ──▶ kernel: target->pending irrelevant ──▶ do_exit(SIGKILL)
                                                   no mask check, no handler,
                                                   no user code runs, period.
                                                   (except: D-state task isn't
                                                   scheduled to die until it
                                                   wakes — §04's caveat)

kill -STOP pid ─▶ kernel: set TASK_STOPPED, deschedule ──▶ scheduler skips it
                                                   SIGCONT reverses (and eats
                                                   a queued STOP).
```

## Masks across fork/exec/threads (who inherits what)

```text
fork() ──▶ child: SAME mask, SAME handlers (copies)
execve() ─▶ SAME mask, handlers RESET to DFL (old code is gone!),
            SIG_IGN stays ignored (deliberate: `trap '' X` + exec idiom)
pthread_create() ─▶ new thread: SAME mask (mask is per-thread!);
                    handlers are PROCESS-wide (shared)
```
