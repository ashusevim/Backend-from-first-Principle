# Process vs Threads: the shared/private line

Visual companion for §14.2. One process, three threads.

```text
PROCESS (pid 6258 = TGID) — everything in this box is SHARED
┌────────────────────────────────────────────────────────────────┐
│ address space: [exe][heap][mmaps][libc]  fds: 0 1 2 ...        │
│ signal DISPOSITIONS  cwd  umask  pid  cgroup  namespaces       │
│                                                                │
│  THREAD main (tid 6258)   THREAD 0 (tid 6259)  THREAD 1 ...   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ RIP RSP regs     │  │ RIP RSP regs     │  │ RIP RSP regs │  │
│  │ [stack] 8M main  │  │ anon 8M stack     │  │ anon 8M stack │  │
│  │ guard page ---p  │  │ guard page ---p  │  │ guard page   │  │
│  │ TLS (errno,...)  │  │ TLS (errno,...)  │  │ TLS (...)    │  │
│  │ signal MASK      │  │ signal MASK      │  │ signal MASK  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                │
│  scheduler (§06) picks TIDs. fork() copies the BOX + ONE       │
│  thread (the caller). exec() burns the box and rebuilds it.    │
└────────────────────────────────────────────────────────────────┘
```

Measured (§14.2 experiment): one pid (6258), tids 6258–6262, main stack
at `0x7ffe…`, thread stacks at `0x7f23…` (8M apart), TLS addrs all
different. `ls /proc/6258/task` = 5 entries; `grep stack
/proc/6258/task/6258/maps` shows [stack] + four UNLABELED 8.0M anon lines (no [stack:TID] tag on 6.1!).
