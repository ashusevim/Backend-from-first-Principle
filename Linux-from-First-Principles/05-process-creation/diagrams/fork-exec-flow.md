# Diagrams — fork / exec / wait, expanded

## `fork()`: one call, two returns

```text
USER (parent, ring 3)              KERNEL (ring 0)              USER (child)
─────────────────────              ───────────────              ────────────
x = 42; ...                        copy_process():
fork() ──rax=57──▶                 ├─ dup task_struct (new PID!)
                                   ├─ copy page tables (mark CoW — §11)
                                   ├─ dup files (SHARE offsets), cred, sighand
                                   ├─ link into parent's children
                                   └─ wake new task (scheduler queue — §06)
   │                                                            │
   ├─ returns 1235 ◀────────────────────────────────────────────┘
   │  (parent resumes)                              returns 0 ───┘
   │                                                 (child resumes,
   ▼                                                 same code, x still 42)
parent: x += 100                (pages copied lazily,     child: x += 1
waitpid(1235) ──sleeps──▶        only on first write)      _exit(0)
```

## `execve()`: same PID, new program

```text
child (ls-to-be)                   KERNEL
────────────────                   ──────
execve("/bin/ls", argv, envp) ──▶   checkPerms (x-bit? setuid? — §23)
                                   flush_old_exec():
                                   ├─ discard old mm (unmap everything)
                                   ├─ reset signal HANDLERS (masks kept!)
                                   ├─ load ELF: map segments, fresh stack
                                   │  argv+envp copied onto it (§12)
                                   └─ set rip = entry point
                                             │
                                             ▼
                                   "returns" into the NEW program
                                   (old code is gone — no way back)
                                   fds SURVIVE (sans CLOEXEC) ──▶ (§08: how
                                   PID/PPID/namespaces UNCHANGED      redirection works)
```

## `waitpid()`: collecting the dead

```text
parent                          KERNEL                          child (exits)
──────                          ──────                          ────────────
waitpid(c) ──▶ task sleeps (S) in wait();  ◀── exit_group(42): free mm,
                                                  files, ...; store 42
                                                  in task_struct;
                                                  state = ZOMBIE;
                                                  wake parent (SIGCHLD)
   │
   ◀── returns c, status=42 (copied out; zombie freed)
```

## Zombie vs orphan timelines

```text
ZOMBIE (parent alive, doesn't wait)        ORPHAN (parent dies first)
───────────────────────────────────        ───────────────────────────
parent ──fork──▶ child                     parent ──fork──▶ child
  │               │ dies, exit 42            │ dies NOW        │
  │ (never waits) ▼                          ▼                 │ still running
  │             (Z) defunct                  │ kernel reparents│
  │             PID slot + 42 held           │ child ──────────▶│ to subreaper/
  │               │                          ├─ (to PID 1)      │ init (ppid jumps!)
  │  wait() ──────┘                              │              │ dies later
  ◀─ reaps, gets 42                              └─ init reaps on sight:
                                                    no zombie possible
```
