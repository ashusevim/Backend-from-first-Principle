# Diagrams — Three paths to the kernel (+ the shortcut)

## libc vs raw vs asm (all converge on `syscall`)

```text
 hello_libc.c              hello_raw.c               hello_asm.s
 ─────────────             ───────────               ───────────
 printf("hi")              syscall(SYS_write,        mov  $1, %rax
   │  libc buffers           1, msg, 3)                mov  $1, %rdi
   ▼                         │                        lea  msg, %rsi
 write(1, buf, n)            │ libc's generic         mov  $3, %rdx
   │  libc wrapper:          │ gate: rax←1,           syscall
   │  rax←1, rdi←1…          │ args→regs, syscall     (you did everything —
   ▼                         ▼                        no libc linked at all)
┌─────────────────────────────────────────────────────────┐
│              `syscall`  ──▶  KERNEL                    │
│              sys_write(fd=1, ...) → terminal driver    │
└─────────────────────────────────────────────────────────┘

 binaries:  ~16 KB dynamic (needs ld-linux + libc)
            ~16 KB dynamic (still linked, still has loader burst)
            ~9 KB, NO interp (kernel loads it directly — §12)
 traces:    ~30 syscalls         ~30 syscalls          2 syscalls (write, exit)
```

## The vDSO shortcut

```text
 normal syscall                        vDSO call (clock_gettime, …)
 ───────────────                       ───────────────────────────
 user:  rax←39, syscall ─┐             user:  call __vdso_clock_gettime
                         ▼                        │  (normal function call —
 kernel: sys_getpid()   ~100ns+                   │   reads kernel-updated
                         │                        │   memory page, no gate)
 user:  ◀── pid ─────────┘             user:  ◀── time (~20ns)

 trace shows getpid(...)               trace shows NOTHING (nothing crossed)
```

## mini-strace: how ptrace sees syscalls

```text
 tracer (parent)                          tracee (child)
 ───────────────                          ─────────────
 fork ───────────────────────────────────▶ PTRACE_TRACEME
 waitpid ◀── child stops ────────────────── (ready)
 PTRACE_SETOPTIONS(TRACESYSGOOD)
   │
   ├──▶ PTRACE_SYSCALL ────────────────────▶ runs until syscall ENTRY, stops
   │     waitpid, GETREGS → orig_rax=1
   │     print "write(1, 0x..., 3 ..."
   │
   ├──▶ PTRACE_SYSCALL ────────────────────▶ runs THROUGH the syscall, stops at EXIT
   │     waitpid, GETREGS → rax=3
   │     print "...) = 3"
   │
   ╰── repeat until WIFEXITED → print "+++ exited with N +++"

 (real strace: this loop + string decoding + 30 years of edge cases)
```
