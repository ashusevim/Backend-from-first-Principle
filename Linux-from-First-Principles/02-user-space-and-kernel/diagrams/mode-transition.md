# Diagrams — The mode transition

## Anatomy of one `getpid()` (time flows down)

```text
RING 3                                    RING 0
──────                                    ──────
  │  program calls getpid()
  ▼
┌────────────────┐
│ libc wrapper   │  rax ← 39 (__NR_getpid)
│ (2-3 insns)    │  rdi.. ← args (none here)
└───────┬────────┘
        │  syscall  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        │    CPU: rcx←rip, r11←rflags, cs←kernel, rsp←kernel stack,
        │         rip←MSR_LSTAR (entry_SYSCALL_64)      ▲ hard wall:
        ▼                                               │ no ring-3 code
┌────────────────────────┐                              │ can run past
│ entry_SYSCALL_64       │  swapgs, build pt_regs,      │ this line
│ (arch/x86/entry/...)   │  KPTI: switch to kernel cr3  │
└───────┬────────────────┘                              │
        ▼                                               │
┌────────────────────────┐                              │
│ sys_getpid()           │  return current->pid  ────────┘
│ (kernel/sys.c)         │  (reads YOUR task_struct)
└───────┬────────────────┘
        │  sysret ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        │    CPU: cs←user, rip←rcx, rflags←r11, KPTI: back to user cr3
        ▼
┌────────────────┐
│ libc returns   │  rax → 4242, errno untouched
└────────────────┘
```

## Cost ladder (order of magnitude, typical x86-64 desktop)

```text
function call ........... ~1 ns
      │
      │  ×100
      ▼
syscall (mitigations off) ~100-300 ns
      │
      │  ×2-3 (KPTI + Spectre guards)
      ▼
syscall (mitigations on)  ~300-1000 ns
      │
      │  ×10-100 (two ptrace stops per syscall!)
      ▼
syscall under strace .... ~10-100 µs
```

Measure your own rung with `code/crossing_cost.c`.
