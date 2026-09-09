# Notes — The standard signals (Linux x86-64, 1–31)

Defaults: **Term** terminate, **Core** terminate + dump core (if `ulimit -c`
allows and `core_pattern` accepts), **Ign** ignore, **Stop** suspend,
**Cont** resume. "Catch?" = whether you may install a handler.

| # | Name | Default | Catch? | Typical source / note |
|---|------|---------|--------|----------------------|
| 1 | SIGHUP | Term | yes | terminal closed; orphaned group (§05); daemons: "reload" |
| 2 | SIGINT | Term | yes | `Ctrl-C` → foreground group |
| 3 | SIGQUIT | Core | yes | `Ctrl-\`; "die with evidence" |
| 4 | SIGILL | Core | yes* | illegal instruction (corrupt binary, bad JIT) |
| 5 | SIGTRAP | Core | yes* | debugger breakpoint (`int3`); `kill -TRAP` also works |
| 6 | SIGABRT | Core | yes* | `abort()` (assert failures) — catchable but re-raised if returned |
| 7 | SIGBUS | Core | yes* | bad *alignment*/mapping (mmap beyond EOF — §10) |
| 8 | SIGFPE | Core | yes* | arithmetic fault (÷0, overflow) — a CPU trap, not floats only |
| 9 | SIGKILL | Term | **NO** | the kill switch; unblockable too |
| 10 | SIGUSR1 | Term | yes | user-defined (reload/dump conventions per daemon) |
| 11 | SIGSEGV | Core | yes* | invalid memory access (the famous one) |
| 12 | SIGUSR2 | Term | yes | user-defined |
| 13 | SIGPIPE | Term | yes | write to read-closed pipe/socket (§17) |
| 14 | SIGALRM | Term | yes | `alarm`/`setitimer`/`timer_create` expiry |
| 15 | SIGTERM | Term | yes | the polite killer (`kill` default; systemd stop) |
| 16 | SIGSTKFLT | Term | yes | coprocessor stack fault ( vestigial — x87 era) |
| 17 | SIGCHLD | Ign | yes | child stopped/exited/continued (note: **17** on Linux; BSD used 20) |
| 18 | SIGCONT | Cont | yes | resume; also discards pending SIGSTOP |
| 19 | SIGSTOP | Stop | **NO** | the suspend switch; unblockable too |
| 20 | SIGTSTP | Stop | yes | `Ctrl-Z` ("please suspend"; vim catches to redraw) |
| 21 | SIGTTIN | Stop | yes | background job reads the terminal (job control) |
| 22 | SIGTTOU | Stop | yes | background job writes the terminal (if `stty tostop`) |
| 23 | SIGURG | Ign | yes | urgent (out-of-band) socket data (§19) |
| 24 | SIGXCPU | Core | yes | CPU time limit (`RLIMIT_CPU`) exceeded |
| 25 | SIGXFSZ | Core | yes | file size limit (`RLIMIT_FSIZE`) exceeded |
| 26 | SIGVTALRM | Term | yes | virtual (user-CPU) timer expiry |
| 27 | SIGPROF | Term | yes | profiling timer expiry (`gprof`'s heartbeat — §35) |
| 28 | SIGWINCH | Ign | yes | terminal resized ("window changed") |
| 29 | SIGIO | Term | yes | async I/O ready (`O_ASYNC` sockets — §21) |
| 30 | SIGPWR | Term | yes | power failure (UPS daemons; also: CRIU/checkpoint tricks) |
| 31 | SIGSYS | Core | yes* | bad syscall (`seccomp` kill — §24; "syscall denied") |

`*` = synchronous (thrown BY your own execution): returning from the handler
re-executes the faulting instruction — handlers must `_exit`/`longjmp`/fix.
(§3 rule 3; `fault.c` demo.)

Realtime: 32–64 (`SIGRTMIN`–`SIGRTMAX`, glibc reserves a few): queued (no
merging), delivered lowest-number-first, carry value+sender
(`sigqueue`, `SA_SIGINFO`). Used by AIO, timers, and pthread internals.

`kill -l` prints your system's table; `man 7 signal` is the canonical page.
`/proc/<pid>/status`: `SigPnd ShdPnd SigBlk SigIgn SigCgt` = thread-pending /
shared(process)-pending / blocked / ignored / caught bitmasks (bit n−1 ↔
signal n — decode with the table above). `kill()`-sent signals wait in
`ShdPnd` while blocked; thread-directed ones (`pthread_kill`) in `SigPnd`.
