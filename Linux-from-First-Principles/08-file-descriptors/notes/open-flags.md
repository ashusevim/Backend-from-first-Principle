# Notes — `open`/`openat` flags, precisely

## Access mode (exactly one — stored in the description)

| Flag | Value | Meaning |
|------|-------|---------|
| `O_RDONLY` | 0 | read only (offset starts 0) |
| `O_WRONLY` | 1 | write only |
| `O_RDWR` | 2 | read + write |
| (mask `O_ACCMODE` = 3) | | `flags & O_ACCMODE` recovers the mode (`fcntl F_GETFL`) |

## Creation / truncation (act at open time)

| Flag | Meaning |
|------|---------|
| `O_CREAT` | create if missing (needs the `mode` arg, e.g. `0644 & ~umask`) |
| `O_EXCL` | with `O_CREAT`: fail `EEXIST` if present (atomic create — lockfiles!) |
| `O_TRUNC` | wipe existing content to 0 (needs write access; the `>` in shells) |
| `O_NOFOLLOW` | refuse to open a trailing symlink (`ELOOP` — symlink-attack defense) |
| `O_DIRECTORY` | fail `ENOTDIR` unless it's a directory (`opendir` uses this) |
| `O_TMPFILE` | create an unnamed inode (link it later with `linkat` — §09) |

## Status flags (live in the description — SHARED across dup/fork!)

| Flag | Meaning |
|------|---------|
| `O_APPEND` | every `write` seeks to end first, atomically (multi-writer logs!) |
| `O_NONBLOCK` | no waiting: `EAGAIN` instead (pipes/sockets/devices — §21) |
| `O_SYNC` / `O_DSYNC` | each `write` waits for storage (databases pay this willingly) |
| `O_DIRECT` | bypass the page cache (databases, benchmarks — §33) |
| `O_NOATIME` | don't update access time on read (backups, owned-or-privileged) |

## The odd one out (per-FD, not per-description!)

| Flag | Meaning |
|------|---------|
| `O_CLOEXEC` | set `FD_CLOEXEC` atomically at open (close on `exec` — §08.5) |

## `open` vs `openat` (why modern code uses `*at`)

`open(path, …)` ≡ `openat(AT_FDCWD, path, …)`. The `dirfd` form enables
race-free relative opens (`openat(dir, "sub/f", …)` can't be redirected by a
renamed parent mid-walk — §09) and is what glibc's `open()` actually calls
(check any trace: there is no `open` anymore, only `openat`).
