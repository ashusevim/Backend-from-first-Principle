# Roadmap & Section Dependencies

Sections are ordered so that **every concept is used before it is assumed**.
The diagram below shows the dependency layers; the table after it lists each
section's hard prerequisites.

```text
Layer 0 — Orientation
  [01 Linux Fundamentals]
              │
Layer 1 — The boundary between you and the kernel
  [02 User Space vs Kernel] ──▶ [03 System Calls]
                                         │
Layer 2 — Processes                        │
  [04 Processes] ◀─────────────────────────┘
      ├──▶ [05 Process Creation] ──▶ [06 Scheduling] ──▶ [07 Signals]
      │
Layer 3 — Files                            │
  [08 File Descriptors] ◀──────────────────┘
      └──▶ [09 Files and Filesystems]
                         │
Layer 4 — Memory         │
  [10 Virtual Memory] ◀──┘
      └──▶ [11 Memory Management] ──▶ [12 ELF & Loading] ──▶ [13 Dynamic Linking]
                                                                  │
Layer 5 — Concurrency & IPC                                       │
  [14 Threads] ◀── (05 clone, 10 address spaces)                   │
      └──▶ [15 Concurrency & Sync]                                 │
  [16 IPC overview] ──▶ [17 Pipes/FIFOs] ──▶ [18 Shared Memory] ◀──┘
                                                                  │
Layer 6 — Networking                                              │
  [19 Sockets] ◀── (03 syscalls, 08 fds)                           │
      └──▶ [20 Linux Networking] ──▶ [21 epoll & event I/O] ◀── (14 threads)
                                                                  │
Layer 7 — Observability & identity                                │
  [22 /proc and /sys] ◀── (04, 09)                                 │
  [23 Users/Permissions] ──▶ [24 Security] ◀── (05, 10 ASLR/NX)     │
                                                                  │
Layer 8 — Isolation (containers)                                  │
  [25 Namespaces] ◀── (05 clone)                                   │
  [26 cgroups]                                                     │
      └──▶ [27 Containers] ──▶ [28 Docker Internals]                │
                                                                  │
Layer 9 — Boot & init                                             │
  [29 Boot] ──▶ [30 systemd] ◀── (05 PID 1, 25, 26)                 │
                                                                  │
Layer 10 — Kernel depth                                           │
  [31 Kernel Modules] ──▶ [32 Kernel Internals] ◀── (everything above)
      ├──▶ [33 Filesystem Internals] ◀── (09)
      └──▶ [34 Network Stack Internals] ◀── (19, 20)
                                                                  │
Layer 11 — Mastery                                                │
  [35 Performance] ◀── (06, 10, 21)                                │
  [36 Debugging & Tracing] ◀── (03, 12)                            │
  [37 Source Code Reading] ◀── (32)                                │
      └──▶ [38 Mini Projects] ◀── (ALL — capstones)
```

## Prerequisites per section

| Section | Requires (hard) | Uses (soft) |
|---------|-----------------|-------------|
| 01 | — | — |
| 02 | 01 | — |
| 03 | 02 | — |
| 04 | 03 | 01 |
| 05 | 04 | 03 |
| 06 | 05 | 04 |
| 07 | 05 | 03 |
| 08 | 03 | 04 |
| 09 | 08 | 04 |
| 10 | 04 | 03 |
| 11 | 10 | 03 |
| 12 | 10, 05 | 08 |
| 13 | 12 | 11 |
| 14 | 05, 10 | 06 |
| 15 | 14 | 06 |
| 16 | 08, 05 | 07 |
| 17 | 16 | 08 |
| 18 | 16, 10 | 15 |
| 19 | 03, 08 | 16 |
| 20 | 19 | 22 |
| 21 | 19 | 14 |
| 22 | 04, 09 | 03 |
| 23 | 09 | 04 |
| 24 | 23 | 05, 10 |
| 25 | 05 | 20 |
| 26 | 04 | 06 |
| 27 | 25, 26 | 09, 05 |
| 28 | 27 | 12, 13 |
| 29 | 01 | 12 |
| 30 | 29, 05 | 25, 26 |
| 31 | 03 | 12 |
| 32 | 06, 10, 09, 05 | all of layers 2–4 |
| 33 | 32, 09 | 10 |
| 34 | 32, 19, 20 | 21 |
| 35 | 06, 10 | 21, 36 |
| 36 | 03, 12 | 07 |
| 37 | 32 | 36 |
| 38 | everything relevant per project | — |

## Suggested milestones (what "done" looks like)

1. **After 03:** you can read an `strace` log and explain every line of a "hello world".
2. **After 07:** you can explain `fork`+`exec`+`wait` as a kernel-level flow and wrote a mini-shell.
3. **After 11:** you drew your process's address space from `/proc/<pid>/maps` and wrote `tiny-malloc`.
4. **After 15:** you wrote a thread pool, found a race with reasoning (not luck), and fixed it.
5. **After 21:** you wrote an epoll event loop and can explain `select`→`poll`→`epoll` as an evolution, not a list.
6. **After 27:** you ran `mycontainer /bin/bash` — your own container runtime.
7. **After 38:** twenty mini-projects; you can look at any command, connection, or container and reason about what's happening underneath.
