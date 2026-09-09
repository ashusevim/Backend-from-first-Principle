# Linux from First Principles

> Don't just learn what Linux does. Learn **why** it does it and **how** it does it.

A complete, practical, experiment-driven guide to **how Linux actually works underneath the commands** — processes, system calls, memory, files, networking, threads, containers, and the kernel itself.

This is a companion track to [Backend from First Principles](https://github.com/ashusevim/Backend-from-first-Principle). That track teaches you to *build* backend systems; this track teaches you the *machine those systems run on*.

---

## Who is this for?

- Backend engineers who run code on Linux but want to understand what happens beneath `fork()`, `malloc()`, `open()`, `socket()`.
- Students who finished a "Linux commands" tutorial and felt it explained nothing.
- Anyone preparing for systems interviews, kernel work, SRE/DevOps, or performance engineering.

## Prerequisites

- A Linux machine (or VM/container). Most experiments also run on WSL2.
- Basic C literacy (you can read a `for` loop and a function call).
- Basic shell comfort (`cd`, `ls`, `cat`).
- `gcc`, `make`, `binutils` (`readelf`, `objdump`, `nm`). Install with your package manager, e.g. `sudo apt install build-essential`.
- Recommended: `strace`, `ltrace`, `gdb`, `perf`. Where these are missing, the repo shows you how to observe the same thing another way (often by *building a tiny version of the tool itself*).

## Learning philosophy

For every important concept we follow the same ladder:

```text
Concept
 ↓
Why it exists
 ↓
What happens internally
 ↓
Kernel mechanism
 ↓
System call / interface
 ↓
Small experiment
 ↓
Implementation
 ↓
Real-world usage
```

Rules of the track:

1. **Experiment first.** Every claim is demonstrated with a command, a program, or a trace — then explained.
2. **No magic tools.** We prefer `C`, `bash`, syscalls, `/proc`, `/sys`, `strace`, `gdb`, `readelf`, `objdump`. No third-party libraries required.
3. **Small programs.** Every `code/` example demonstrates exactly one concept and compiles with `-Wall -Wextra` and zero warnings.
4. **Draw the flow.** Complicated paths (e.g. `fork()`, `execve()`, a TCP handshake) get step-by-step execution-flow diagrams.
5. **Safe by default.** Dangerous experiments use temp dirs/VMs/containers and are clearly labeled. Nothing here will nuke your system if you follow the labels.

## How to use this repository

Each numbered section is self-contained:

```text
NN-topic/
├── README.md       # the lesson: concepts, flows, diagrams, explanations
├── notes/          # short reference notes (command→mechanism maps, etc.)
├── experiments/    # bash scripts you run to SEE the concept
├── code/           # small C (sometimes asm) programs + Makefile
└── diagrams/       # ASCII execution-flow diagrams (also embedded in READMEs)
```

Work through sections **in order** — later sections depend on earlier ones (see [ROADMAP.md](ROADMAP.md) for the dependency graph). In each section:

1. Read `README.md`.
2. Run the `experiments/` scripts.
3. Build and run the `code/` (`make`, `./program`).
4. Do the exercises at the end of the README before moving on.

Verify your toolchain first:

```bash
gcc --version && make --version && readelf --version | head -1
# recommended:
which strace gdb perf ltrace
```

> **No `strace`?** Section 03 shows you how to build `mini-strace` (a ~100-line syscall tracer using `ptrace`), and experiment scripts automatically fall back to it. Building the tool *is* the lesson.

## The roadmap

| # | Section | What you'll understand |
|---|---------|------------------------|
| 01 | [Linux Fundamentals](01-linux-fundamentals/) | Kernel vs OS vs distro, user/kernel space, shell, everything-is-a-file |
| 02 | [User Space and Kernel](02-user-space-and-kernel/) | Privilege rings, mode transitions, why apps can't touch hardware |
| 03 | [System Calls](03-system-calls/) | Syscall ABI, libc vs raw syscalls, errno, vDSO, tracing |
| 04 | Processes | What a process *is*: PID, states, `task_struct`, address space |
| 05 | Process Creation | `fork`/`clone`/`exec`/`wait`, orphans, zombies, mini-shell |
| 06 | Process Scheduling | Scheduler, context switch, preemption, `nice`, RT |
| 07 | Signals | Async kernel→process messaging, handlers, masks |
| 08 | File Descriptors | fd → open file description → inode → storage |
| 09 | Files and Filesystems | inodes, links, mounts, VFS |
| 10 | Virtual Memory | Pages, page tables, faults, TLB, `mmap` |
| 11 | Memory Management | `malloc`/`brk`/`mmap`, CoW, **tiny malloc** |
| 12 | ELF and Program Loading | Headers, segments, how a binary becomes a process |
| 13 | Dynamic Linking | `.so`, PLT/GOT, symbol resolution |
| 14 | Threads | `clone`, pthreads, shared address space, **thread pool** |
| 15 | Concurrency and Synchronization | Races, mutexes, atomics, deadlocks (break it, then fix it) |
| 16 | Inter-Process Communication | Signals, queues, Unix sockets — the IPC landscape |
| 17 | Pipes and FIFOs | `pipe()`, redirection, named pipes |
| 18 | Shared Memory | `shm_open`/`mmap`, coherence thinking |
| 19 | Sockets | TCP/UDP servers + clients from scratch |
| 20 | Linux Networking | Interfaces, routing, ARP, `ss`/`ip` internals |
| 21 | epoll and Event-Driven I/O | `select`→`poll`→`epoll`, **mini event loop** |
| 22 | Proc and Sys Filesystems | Kernel state as files, **process inspector** |
| 23 | Users, Permissions, Capabilities | UID/GID, `chmod`, setuid, capabilities |
| 24 | Linux Security | seccomp, ASLR, NX, canaries, MAC |
| 25 | Namespaces | PID/net/mnt/UTS/IPC/user isolation primitives |
| 26 | cgroups | CPU/mem limits, accounting, v1 vs v2 |
| 27 | Linux Containers | **mini container runtime** from namespaces+cgroups |
| 28 | Docker Internals | What Docker does underneath (image layers, drivers) |
| 29 | Boot Process | Firmware → bootloader → kernel → initramfs → PID 1 |
| 30 | Init and Systemd | Units, dependencies, timers, journald |
| 31 | Kernel Modules | `insmod`, lifecycle, your first module |
| 32 | Kernel Internals | Scheduler, MM, VFS, workqueues, interrupts |
| 33 | Filesystem Internals | dentry, page cache, block layer, journaling |
| 34 | Network Stack Internals | TCP state machine, routing, netfilter, drivers |
| 35 | Performance Engineering | `perf`, flame graphs, syscall/cache analysis |
| 36 | Debugging and Tracing | `gdb`, core dumps, crash labs |
| 37 | Linux Source Code Reading | A repeatable method to trace any feature in-tree |
| 38 | Mini Projects | 20 capstone builds tying it all together |

Detailed progression + dependencies: [ROADMAP.md](ROADMAP.md).

## Progress checklist

- [x] 01 — Linux Fundamentals
- [x] 02 — User Space and Kernel
- [x] 03 — System Calls
- [x] 04 — Processes
- [x] 05 — Process Creation
- [x] 06 — Process Scheduling
- [x] 07 — Signals
- [ ] 08 — File Descriptors
- [ ] 09 — Files and Filesystems
- [ ] 10 — Virtual Memory
- [ ] 11 — Memory Management
- [ ] 12 — ELF and Program Loading
- [ ] 13 — Dynamic Linking
- [ ] 14 — Threads
- [ ] 15 — Concurrency and Synchronization
- [ ] 16 — Inter-Process Communication
- [ ] 17 — Pipes and FIFOs
- [ ] 18 — Shared Memory
- [ ] 19 — Sockets
- [ ] 20 — Linux Networking
- [ ] 21 — epoll and Event-Driven I/O
- [ ] 22 — Proc and Sys Filesystems
- [ ] 23 — Users, Permissions, Capabilities
- [ ] 24 — Linux Security
- [ ] 25 — Namespaces
- [ ] 26 — cgroups
- [ ] 27 — Linux Containers
- [ ] 28 — Docker Internals
- [ ] 29 — Boot Process
- [ ] 30 — Init and Systemd
- [ ] 31 — Kernel Modules
- [ ] 32 — Kernel Internals
- [ ] 33 — Filesystem Internals
- [ ] 34 — Network Stack Internals
- [ ] 35 — Performance Engineering
- [ ] 36 — Debugging and Tracing
- [ ] 37 — Linux Source Code Reading
- [ ] 38 — Mini Projects

## Contributing

This track is built incrementally, section by section, with every program compiled and every experiment verified on real Linux. Contributions that follow that bar are welcome:

- New experiments with **verified** output.
- Code in C (preferred), asm where it clarifies, bash for experiments.
- Diagrams for complicated flows.
- Fixes to explanations that are shallow or wrong — with evidence.

Open an [issue](https://github.com/ashusevim/Linux-from-First-Principles/issues) or [pull request](https://github.com/ashusevim/Linux-from-First-Principles/pulls).

## License

Same license as the [parent project](https://github.com/ashusevim/Backend-from-first-Principle).
