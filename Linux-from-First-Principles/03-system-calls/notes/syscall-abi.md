# Notes — x86-64 syscall ABI, errno, vDSO

## Register convention (System V syscall ABI)

| Slot | Register | Notes |
|------|----------|-------|
| number | `rax` | input: `__NR_xxx`; output: return value |
| arg 1 | `rdi` | |
| arg 2 | `rsi` | |
| arg 3 | `rdx` | |
| arg 4 | `r10` | NOT `rcx` — `syscall` clobbers `rcx` (return rip) |
| arg 5 | `r8` | |
| arg 6 | `r9` | |
| clobbered | `rcx`, `r11` | return rip + saved rflags |

More than 6 args? Doesn't happen — syscalls take ≤6 (e.g. `mmap` takes 6).

## Return-value protocol

- `rax >= 0`: success. Meaning per-call (fd, byte count, pid…).
- `rax in [-4095, -1]`: error, value is `-ERRNO`. (Range `-4095..-1` is how
  libc distinguishes error from a legitimate pointer/count.)
- libc wrapper: `errno = -rax; return -1;`. Raw `syscall()`: you get `-ERRNO`.

## Where the numbers live

- Installed headers: `/usr/include/x86_64-linux-gnu/asm/unistd_64.h`
  (`#define __NR_write 1` …) — try `grep -E '__NR_(read|write|open|execve|exit)'`.
- Kernel source: `arch/x86/entry/syscalls/syscall_64.tbl`.
- The most common two dozen:

| # | name | # | name | # | name |
|---|------|---|------|---|------|
| 0 | read | 3 | close | 9 | mmap |
| 1 | write | 8 | lseek | 11 | munmap |
| 2 | open (legacy; use openat) | 39 | getpid | 59 | execve |
| 4 | stat | 57 | fork | 60 | exit |
| 5 | fstat | 56 | clone | 231 | exit_group |
| 257 | openat | 262 | newfstatat | 322 | …(newer calls keep coming) |

Note `exit` (60) vs `exit_group` (231): single-threaded programs still call
`exit_group` via libc (kill whole thread group); raw `exit` kills one thread.

## The errno greatest hits (from `asm-generic/errno-base.h`)

`1 EPERM, 2 ENOENT, 3 ESRCH, 4 EINTR, 5 EIO, 9 EBADF, 11 EAGAIN, 12 ENOMEM,
13 EACCES, 14 EFAULT, 17 EEXIST, 22 EINVAL, 24 EMFILE, 32 EPIPE`.

## vDSO-accelerated calls (no kernel crossing)

`clock_gettime`, `gettimeofday`, `time`, `getcpu` (+ `clock_getres` on some
kernels). Detect them: present in your program, absent from its trace.
See yours: `cat /proc/self/maps | grep vdso`.
