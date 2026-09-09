# Notes — `clone()`: one call, every kind of task

`long clone(unsigned long flags, void *child_stack, ...)` (plus `clone3` with
a struct). The flags decide what the child **shares** with the parent.
Everything else is copied (or CoW).

## Sharing flags (the "what kind of task" dial)

| Flag | Shares… | Used by |
|------|---------|---------|
| (none — `SIGCHLD` only) | nothing | `fork()` |
| `CLONE_VM` | address space (same memory!) | threads, `vfork` |
| `CLONE_FS` | cwd/root/umask | threads |
| `CLONE_FILES` | fd table | threads |
| `CLONE_SIGHAND` | signal handlers (+ blocked mask with `CLONE_THREAD`) | threads |
| `CLONE_THREAD` | thread group (same TGID!) | threads (implies sharing signals-as-group) |
| `CLONE_SYSVSEM` | System V semaphore undo values | threads |
| `CLONE_SETTLS` | sets `%fs` from the extra arg (thread-local storage!) | threads (§14) |
| `CLONE_PARENT` | child of MY parent (sibling, not child) | thread-pool helpers, some tracers |
| `CLONE_VFORK` | parent frozen until child `exec`s/`_exit`s | `vfork()` (obsolete — CoW won) |
| `CLONE_PIDFD` | get a pidfd for the child (race-free signaling) | modern process managers (§30) |

## Isolation flags (the "what kind of container" dial — §25)

| Flag | Isolates… (child gets a fresh one) |
|------|-------------------------------------|
| `CLONE_NEWNS` | mount table (files each side sees) |
| `CLONE_NEWPID` | PID numbers (child is PID 1 in there!) |
| `CLONE_NEWNET` | network stack (interfaces, routes, firewall) |
| `CLONE_NEWIPC` | SysV IPC + POSIX message queues |
| `CLONE_NEWUTS` | hostname + domain name |
| `CLONE_NEWUSER` | UID/GID mapping (root-in-container, nobody-outside) |
| `CLONE_NEWCGROUP` | cgroup view |
| `CLONE_NEWTIME` | system/boot clocks offsets |

## The three recipes (memorize this table)

```c
/* A PROCESS — shares nothing (classic fork) */
clone(SIGCHLD, child_stack, ...);

/* A THREAD — shares (almost) everything (what pthread_create does) */
clone(CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND |
      CLONE_THREAD | CLONE_SYSVSEM | CLONE_SETTLS | CLONE_PARENT_SETTID |
      CLONE_CHILD_CLEARTID, child_stack, ..., tls);

/* A CONTAINER PROCESS — shares everything except listed namespaces */
clone(SIGCHLD | CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWNET |
      CLONE_NEWUTS | CLONE_NEWIPC, child_stack, ...);
```

One syscall. Three rows. Processes (§05), threads (§14), containers (§27) —
the whole track's dramatis personae, distinguished by a bitmask.
