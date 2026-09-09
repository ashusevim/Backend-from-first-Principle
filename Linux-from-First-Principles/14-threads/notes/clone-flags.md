# clone() Flags: one call, every process/thread flavor

Reference for §14.1. `clone(fn, stack, flags, arg, ptid, tls, ctid)` —
the flags choose WHAT the child shares. (`clone3` takes the same flags
in a struct + exit-signal, stack size, set_tid… — same idea, cleaner ABI.)

## The sharing dials (set = SHARE with parent)

| Flag | Shares | fork | pthread_create |
|------|--------|------|----------------|
| `CLONE_VM` | address space | — | ✓ |
| `CLONE_FS` | cwd/umask/root | — | ✓ |
| `CLONE_FILES` | fd table (§08!) | — (copied) | ✓ |
| `CLONE_SIGHAND` | signal dispositions (§07) | — (copied) | ✓ |
| `CLONE_THREAD` | thread GROUP (same TGID!) | — | ✓ (THIS makes it a "thread") |
| `CLONE_SYSVSEM` | SysV semaphore undo list | — | ✓ |
| `CLONE_SETTLS` | set `%fs` from 4th arg (TLS base!) | — | ✓ |
| `CLONE_PARENT_SETTID`/`CHILD_CLEARTID` | TID plumbing for futex wake on exit | — | ✓ (join's machinery) |
| `CLONE_CHILD_SETTID` | write child TID to ctid | — | ✓ |

Plus the signal number in the low byte = what the child sends on death
(`SIGCHLD` for fork/pthreads; `CLONE_THREAD` forbids anything else).

## The presets

- **`fork`** = `clone(SIGCHLD)` — share nothing (VM CoW-copied, §10.7).
- **`vfork`** = `clone(CLONE_VFORK|CLONE_VM, SIGCHLD)` — share VM AND
  suspend parent until child execs/exits (§05's loaded gun).
- **`pthread_create`** = `clone(child_stack, CLONE_VM|FS|FILES|SIGHAND|
  THREAD|SYSVSEM|SETTLS|PARENT_SETTID|CHILD_CLEARTID, …)` + a fresh
  8 MiB stack with guard page + TLS block carved by the loader's
  `PT_TLS` template (§13's `allocate_stack`).
- **Namespaces** (§25) ride the SAME call: `CLONE_NEWNS|NEWPID|NET…` —
  containers are clone flags + cgroups (§26). One syscall, all the way down.

## Seeing it

`mini_strace` prints `clone(0xFLAGS, …)` — decode: `0x3d0f00` =
VM|FS|FILES|SIGHAND|THREAD|SYSVSEM… (experiment: `clone` grep on
`thrinfo`). `CLONE_THREAD` without `SIGHAND` (or without `VM`) is
rejected with EINVAL — the kernel enforces the combos that make sense.
