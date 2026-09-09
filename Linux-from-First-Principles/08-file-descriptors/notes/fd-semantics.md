# Notes — fd semantics: the sharp edges

## `close()`: what it really does

1. Removes YOUR fd → description link. 2. Decrements the description
   refcount. 3. At zero: calls the file's `release` op (sockets: may send
   FIN; locks held via `flock`: dropped; mappings: unaffected — `mmap`
   survives `close`! §10). stdio buffers are NOT flushed (user space —
   `fclose`/`fflush` first). Return value: 0, or -1 (`EBADF` — and YES,
   check it on NFS/`O_SYNC` files, where writeback errors surface here).

## `CLOEXEC` discipline (the daemon rules)

- Default everything `O_CLOEXEC`. fds that MUST cross `exec` (shell's 0/1/2,
  a passed socket) get it cleared explicitly.
- `dup2` clears `CLOEXEC` on the target (POSIX); `dup3` takes it as a flag
  (Linux). `fcntl(F_DUPFD_CLOEXEC)` for the rest.
- Leaked-across-exec fds cause: un-rotatable logs (deleted inode held open),
  un-rebindable ports (listening socket inherited by children that never
  close it), hangs (`read` on a pipe whose write end you forgot in a
  grandchild — EOF never comes; §17's classic).

## `fcntl` greatest hits (`<fcntl.h>`)

| Command | Effect |
|---------|--------|
| `F_GETFL` / `F_SETFL` | get/set description status flags (`O_APPEND`, `O_NONBLOCK` — NOT the access mode!) |
| `F_GETFD` / `F_SETFD` | get/set per-fd flags (`FD_CLOEXEC`) |
| `F_DUPFD` / `F_DUPFD_CLOEXEC` | dup with a minimum fd number (the `dup2` building block) |
| `F_SETLK` / `F_SETLKW` / `F_GETLK` | POSIX record locks (advisory, per-process — §15) |
| `F_SETPIPE_SZ` / `F_GETPIPE_SZ` | pipe buffer size (§17) |

## Limits and exhaustion

- `RLIMIT_NOFILE` (`ulimit -n`): per-process cap → `EMFILE` ("Too many open
  files" — the "files" are fds: files + sockets + pipes + epolls…).
- System-wide: `/proc/sys/fs/file-max`, `file-nr` → `ENFILE` (rare — the box
  is out, not you).
- Bulk close: `close_range(3, ~0, 0)` (newer kernels) — what careful daemons
  call after fork instead of looping to `getdtablesize()`.
- Debugging: `ls /proc/<pid>/fd | wc -l` (count), `lsof -p <pid>` (details),
  `ls -l /proc/<pid>/fd` (targets — `socket:`, `pipe:`, ` anon_inode:`…).
