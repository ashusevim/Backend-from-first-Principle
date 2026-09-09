# Notes — `/proc/<pid>` field map

What each entry is, which `task_struct` (or related) data it renders, and
where this track goes deep. All values are generated at `read()` time —
nothing here is stored on disk.

## Identity & state

| File | Renders | Notes |
|------|---------|-------|
| `status` | pid, comm, state, ppid, uids/gids, memory summary… | human-readable; start here |
| `stat` | 52+ whitespace-separated fields, one line | what `ps`/`top` parse; `comm` is field 2 **in parentheses** (may contain spaces!) |
| `statm` | 7 memory numbers (pages): size/resident/shared/… | cheap version of the memory summary |
| `cmdline` | `argv`, NUL-separated, no trailing newline | kernel threads: empty! (they never `exec`ed) |
| `comm` | the 16-byte task name (`task_struct.comm`) | `pthread_setname_np` changes it; shows in `top` |
| `environ` | `envp`, NUL-separated | readable only if same-UID (or privileged) — secrets live here! |

## Relationships & context

| File | Renders | Notes |
|------|---------|-------|
| `exe` | symlink → binary on disk | `… (deleted)` = upgraded/replaced underneath a running process |
| `cwd` | symlink → working directory | why `cd` must be a shell builtin (§01): it's per-process |
| `root` | symlink → filesystem root | differs from `/` inside `chroot`/containers (§27) |
| `task/` | one subdir per thread (TID) | each mirrors the full layout — threads are tasks (§14) |
| `children` | space-separated child PIDs | cheap; `pstree` walks this |
| `stack` | current kernel stack trace | your own processes: readable; others: usually `[<0>]` (hidden) |

## Resources (deep dives later)

| File | Renders | Section |
|------|---------|---------|
| `fd/` + `fdinfo/` | open files + per-fd details (offset, flags) | §08 |
| `maps` + `smaps` | VMAs: every mapped region (+ detailed counters) | §10 |
| `mem` | the process's memory (via `lseek`+`read`) | §10; guarded (§02: EPERM demo) |
| `mountinfo`/`mounts` | what this process sees mounted | §09, §25 |
| `ns/` | namespace membership symlinks | §25 |
| `cgroup` | cgroup path | §26 |
| `io` | read/write byte counters | §35 |
| `sched`, `schedstat` | scheduler policy, vruntime, wait/slice stats | §06 |
| `syscall` | currently-executing syscall + args (or `running`) | §03 in live form! |
| `wchan` | kernel function the task sleeps in | needs privilege for others; `0`/blank = running |
| `limits` | `RLIMIT_*` (open files, stack, …) | §05 (`ulimit`), §23 |
| `loginuid` | audit login UID | §30 (logind) |

## Classic gotchas

1. **Parsing `stat`?** `comm` (field 2) may contain spaces AND parens
   (`(my) proc`). Rule: field 1 ends at the first space; `comm` runs to the
   **LAST** `)` on the line; field 3 starts after it. (`procself.c` does this.)
2. **`cmdline` of kernel threads is EMPTY** — `ps` shows `[kthreadd]` from
   `comm` instead. A process with empty cmdline + PPID 2 = kernel thread.
3. **Numbers in `stat` are in jiffies/pages**, not seconds/bytes: divide
   `utime`/`stime` by `sysconf(_SC_CLK_TCK)` (usually 100); multiply `rss`
   by the page size.
