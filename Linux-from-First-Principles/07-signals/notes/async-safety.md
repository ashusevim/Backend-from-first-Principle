# Notes — Async-signal safety (the handler rules)

## Why handlers are special

A handler runs **between arbitrary instructions** — possibly inside `malloc`
(lock held), inside `printf` (buffer half-built), inside another handler.
Anything that isn't reentrant or lock-free can deadlock or corrupt.

## The rules

1. **Call ONLY async-signal-safe functions.** The POSIX list (see `man 7
   signal-safety`) is short: `_exit`, `write`, `read`, `sigaction`,
   `sigprocmask`, `kill`, `waitpid`, `alarm`, … — notably **NOT**:
   `printf`, `malloc`/`free`, `pthread_mutex_*`, `exit` (runs atexit +
   flushes stdio!), most of libc.
2. **The flag pattern (preferred):** handler sets a `volatile sig_atomic_t`
   and returns; main-line code polls the flag and does the real (unsafe) work
   (`printf`, allocation, cleanup). (`sigdemo.c` is the reference.)
3. **Keep `errno` intact:** if the handler calls anything that sets errno,
   save/restore it (`int e = errno; …; errno = e;`) — the interrupted code
   may be mid-error-check.
4. **`SA_RESTART` or handle `EINTR`:** without it, slow syscalls fail with
   `EINTR` when any handled signal lands. Libraries must retry; programs
   must expect it (§05 minish does).
5. **Sync-signal handlers don't return** (or the fault recurs): `_exit`,
   `siglongjmp`, or repair-then-return. (`fault.c`.)

## The self-pipe trick (preview of §21)

Flag polling needs a wakeup: also `write()` one byte to a pipe in the handler;
the main loop `select`/`poll`/`epoll`s the pipe. Byte arrives ⇒ signal
arrived ⇒ handle it in normal code, with all of libc available. This is how
serious event loops (Qt, many daemons) marry signals to I/O.

## `signal()` vs `sigaction()` (why the README insists)

Historic `signal()` had two behaviors: SysV (handler resets to DFL on entry —
race window!) vs BSD (stays installed). glibc's `signal()` is BSD-style, but
only `sigaction()` gives you: `SA_RESTART`, `SA_SIGINFO` (sender PID + data),
masks during handling (`sa_mask`), and portability. Always `sigaction`.
