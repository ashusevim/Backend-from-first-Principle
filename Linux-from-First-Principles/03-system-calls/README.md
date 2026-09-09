# 03 — System Calls

**Question this section answers:** *What is the exact contract between a
program and the kernel — and how do I watch it happen?*

By the end you can: read a syscall table, hand-assemble a syscall in C and in
raw assembly, explain `errno`, explain why some "syscalls" never enter the
kernel (vDSO), and trace any program — with `strace`, or with a tracer you
built yourself.

---

## 1. The contract: numbers, registers, return values

A system call is a function call where the function lives in the kernel. Since
you can't `call` kernel code directly (Section 02), the contract is:

1. Put the **syscall number** in `rax` (`0` = `read`, `1` = `write`,
   `60` = `exit`, … full list in
   `/usr/include/x86_64-linux-gnu/asm/unistd_64.h`, or
   `arch/x86/entry/syscalls/syscall_64.tbl` in the kernel source).
2. Put up to 6 **arguments** in `rdi, rsi, rdx, r10, r8, r9` (in that order —
   note `r10`, *not* `rcx`: `syscall` itself clobbers `rcx`).
3. Execute **`syscall`**.
4. Read the **return value** from `rax`: success (≥ 0, meaning depends on the
   call) or `-ERRNO` (e.g. `-2` = `-ENOENT`).

```text
rax ← 1          (__NR_write)
rdi ← 1          (fd: stdout)
rsi ← buf        (pointer — kernel will validate it!)
rdx ← len        (count)
syscall          ──▶ kernel: sys_write() ──▶ VFS ──▶ terminal driver
rax → 14         (bytes written)   ...or rax → -9 (-EBADF: bad fd)
```

That's the whole ABI. Everything else in this section is commentary.

▶ **Reference:** [notes/syscall-abi.md](notes/syscall-abi.md) — the register
table, the errno protocol, and where the tables live.

## 2. Three ways to make the same syscall

The same `write(1, "hi", 3)` can be issued at three levels. They all converge
on the same `syscall` instruction — the difference is how much help you get:

| Level | Code | Who sets up registers? |
|-------|------|------------------------|
| **libc wrapper** | `write(1, "hi", 3);` | glibc (`write()` in libc.so) |
| **generic gate** | `syscall(SYS_write, 1, "hi", 3);` | you (number + args), via libc's `syscall()` |
| **raw assembly** | `mov $1,%rax; …; syscall` | you, entirely — no libc at all |

▶ **Code:** three hello-worlds, same bytes on the same fd:

- `code/hello_libc.c` — `printf` (goes through libc buffering + `write`).
- `code/hello_raw.c` — `syscall(SYS_write, …)` + `syscall(SYS_exit, …)`.
- `code/hello_asm.s` — `_start:` in pure assembly, linked with `-nostdlib`
  (no libc, no `_start` from crt — *you* are the entry point).

▶ **Experiment:** `experiments/03-libc-vs-raw-vs-asm.sh` — proves all three
print the same thing, then shows how differently-sized their binaries and
traces are. Spoiler: the libc one does ~30 syscalls before `main` even runs
(loader, locale, …); the asm one does exactly 2.

## 3. `errno`: how the kernel says "no"

The kernel has one return channel (`rax`), so errors are **negative errno
values**: `open()` a missing file → kernel returns `-ENOENT` (`-2`). The libc
wrapper translates:

```text
kernel returns -2  ──▶ libc wrapper: errno = 2; return -1  ──▶ you check:
                                                          if (fd < 0) {
                                                              perror("open"); // open: No such file or directory
                                                          }
```

Rules that bite beginners:

- `errno` is only meaningful **immediately after a failed call** (any later
  libc call may overwrite it; it's thread-local — each thread has its own).
- `0` from a syscall usually means success-with-nothing (EOF, no bytes) —
  **not** an error. `-1` from a *wrapper* means "go read errno".
- Raw `syscall()` does **not** set errno — you get the raw `-2` back. That's
  a feature: it shows you what the kernel actually said.

▶ **Code:** `code/errno_demo.c` — fails an `open()` three ways (wrapper,
`strerror`, raw) and prints what each layer reports.
▶ **Experiment:** `experiments/02-errno-lab.sh`.

## 4. The syscalls that aren't: vDSO

Some kernel answers don't require entering the kernel at all: the current
time, the CPU number. For these, the kernel maps a tiny shared library — the
**vDSO** (`virtual dynamic shared object`) — into every process. Calls like
`clock_gettime()`, `gettimeofday()`, `time()`, `getcpu()` run entirely in user
space, reading kernel-maintained memory:

```text
getpid()                         clock_gettime()
   │  real syscall                  │  vDSO: plain function call
   ▼                                ▼
 user ──syscall──▶ kernel        user ──reads──▶ kernel-updated page
   ▲  (~100+ ns)                    (no crossing! ~20 ns)
```

Proof: trace a program calling both — `getpid` appears in the log,
`clock_gettime` doesn't. That's not a tracer bug; the crossing never happened.

▶ **Code:** `code/vdso_demo.c` + trace it (experiment 01 shows how).

Why does this exist? `clock_gettime` is called *millions* of times per second
across a system (timeouts, profiling, databases…). At ~100ns per crossing
that's real money; vDSO makes it ~20ns. Same lesson as Section 02's cost
ladder: **the kernel engineers count nanoseconds, and now you can too.**

## 5. Watching it happen: tracing

### With `strace` (if you have it)

```bash
strace -o trace.log ./hello_libc
strace -c ./hello_libc        # count + time per syscall
strace -e trace=write ./hello_libc   # only writes
```

Learn to read the log: `execve(...)` first (how you got here),
`openat/mmap/mprotect/brk` (loader building your address space — §12),
`write(1, ...)` (your actual output), `exit_group(0)` last.

### With `mini-strace` (built here, works everywhere)

No `strace`? No problem — build one. `code/mini_strace.c` (~150 lines) uses
the kernel's debugging interface, **`ptrace`**, the same primitive `strace`
and `gdb` are built on:

```text
child:  PTRACE_TRACEME → raise(SIGSTOP) ──▶ parent installs options
           │                                    (TRACESYSGOOD | TRACEEXEC)
           ▼
        exec target ──▶ execve ENTRY ──▶ EXEC event ──▶ execve EXIT ──▶ new image
           │              (old image,      │              (new regs,       │ entry/exit
           │               real args)      │               rax = 0)        │ stops alternate
parent:    ▼                               ▼                                 ▼
        PTRACE_SYSCALL loop → PTRACE_GETREGS → orig_rax = number
           │ prints:  write(1, 0x..., 14) = 14
           ▼
        target exits → tracer reports exit code
```

Building the tool teaches the mechanism better than any manual: after this,
`strace` is no longer magic — it's "that ptrace loop, plus 30 years of
decoders". (Section 36 returns to `ptrace` for real debugging.)

▶ **Experiment:** `experiments/01-trace-hello.sh` — auto-uses `strace` if
present, else `mini-strace`, and compares the three hello-worlds.

## 6. The full picture

```text
YOUR CODE ──┬── libc wrapper (write, open, malloc→mmap/brk…) ──┐
            │                                                  ▼
            ├── syscall(SYS_xxx, ...) ──────────────▶ `syscall` instruction
            │                                                  │
            └── raw asm ───────────────────────────────────────┘
                                                               ▼
                                              ┌────────────────────────────────┐
                                              │ KERNEL entry_SYSCALL_64        │
                                              │  table[rax] → sys_xxx()       │
                                              │  validate pointers/capabilities│
                                              │  do the work (VFS/mm/net/...) │
                                              │  return value or -ERRNO        │
                                              └────────────────────────────────┘
```

And the escape hatch: **vDSO** calls skip this diagram entirely.

---

## Experiments

```bash
cd experiments/
./01-trace-hello.sh          # trace all 3 hello-worlds (strace or mini-strace)
./02-errno-lab.sh            # fail on purpose, read errno at every layer
./03-libc-vs-raw-vs-asm.sh   # same output, wildly different paths to get there
```

## Build the code

```bash
cd code/
make
./hello_libc && ./hello_raw && ./hello_asm
./errno_demo
./vdso_demo
./mini-strace ./hello_asm
```

## Exercises

1. Trace `./hello_libc`: find `execve`, the loader's `openat`/`mmap` burst,
   your `write`, and `exit_group`. Why does `hello_asm` skip the burst?
   (Answer in §12: no dynamic loader, no libc init.)
2. `./mini-strace /bin/true` — how many syscalls does "nothing" take? Compare
   with your Section 01 guess.
3. In `errno_demo`, note the raw `syscall()` return of `-2`. Where does the
   *name* "No such file or directory" come from? (`strerror` table in libc —
   the kernel only ever sends the number.)
4. Time 1M `clock_gettime()` vs 1M `getpid()` calls (adapt Section 02's
   `crossing_cost.c`). The ratio is the vDSO dividend.
5. (Hard) Extend `mini-strace` to decode `openat`'s pathname by reading the
   child's memory (`PTRACE_PEEKDATA` / `process_vm_readv`). This is how real
   tracers print strings.

## Further reading (in this track)

- Next: [04 — Processes](../04-processes/) *(coming next — needs this
  section's syscall + tracing fluency)*.
- Reference: [notes/syscall-abi.md](notes/syscall-abi.md).
- Diagrams: [diagrams/syscall-path.md](diagrams/syscall-path.md).
