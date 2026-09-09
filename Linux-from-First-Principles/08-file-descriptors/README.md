# 08 — File Descriptors

**Question this section answers:** *What is the number `1` in `write(1, …)` —
and what chain of kernel objects does it unlock, all the way down to bytes on
a disk (or a terminal, or a socket)?*

By the end you can: draw the fd → description → inode → driver chain from
memory, predict exactly what `fork`/`dup`/`open` share and don't, implement
shell redirection by hand, and explain why `close(1); open(file)` redirects.

---

## 1. The chain (memorize this)

A file descriptor is a **small integer index into YOUR process's fd table**.
Each entry points to an **open file description** (offset + status flags,
in the system-wide open file table), which points to an **inode**
(the file itself + its operation table), which belongs to a **filesystem**
with drivers below:

```text
YOUR PROCESS (fd table)      SYSTEM-WIDE                    STORAGE
───────────────────────      ───────────                    ───────
fd 0 ──┐
fd 1 ──┼──▶ open file        ┌─────────┐   ┌──────────┐
fd 2 ──┘    description ────▶│  inode  │──▶│ filesystem│──▶ disk / terminal
            {offset: 1530,   │ (ext4 / │   │ driver   │    / pipe / socket /
             flags: O_RDWR}  │  pipe / │   │ (ops!)   │    kernel-generated
                             │  socket}│   └──────────┘    (proc!)
fd 5 ───────▶ open file ──▶ (another inode...)
            description
            {offset: 0, ...}

fork()/dup() ──▶ new fd, SAME description (SHARED offset!)
open() again ──▶ new fd, NEW description (SEPARATE offsets!)
```

Three levels, three lifetimes: the **fd** dies with `close()`/`exec(CLOEXEC)`/
process exit; the **description** dies when its last fd closes (refcount!);
the **inode** (unlinked file) dies when its last description closes (§09's
open-but-deleted files).

▶ **Diagrams:** [diagrams/fd-chain.md](diagrams/fd-chain.md) — the chain plus
every operation's effect on it.

## 2. `open`: how a path becomes a number

`open(path, flags, mode)` (modern code: `openat(dirfd, path, …)`) makes the
kernel:

1. **Resolve** the path: walk each component (`/` → `tmp` → `x`), needing
   execute (`x`) permission on every directory, following symlinks (unless
   `O_NOFOLLOW`), ending at a dentry+inode (full story §09).
2. **Check** permissions against your credentials (read? write? §23).
3. **Allocate** an open file description (offset 0, or end if `O_APPEND`).
4. **Install** it at the **lowest free fd number** and return that number.

Step 4 is the quiet superpower behind all of Unix redirection: if you
`close(1)` first, the next `open()` returns `1` — stdout now IS that file.
The 1970s redirection trick, still working today (demo in experiment 03).

▶ **Reference:** [notes/open-flags.md](notes/open-flags.md) — every flag and
what it changes in the description.

## 3. `dup`/`dup2`: aliasing (the redirection primitive)

- `dup(old)` → new fd (lowest free), **same description** (shared offset,
  shared flags — except `FD_CLOEXEC`, which is per-fd!).
- `dup2(old, new)` → `new` becomes an alias of `old` (silently closing what
  `new` pointed to first). **This single call IS shell redirection.**
- `dup3` adds `O_CLOEXEC` atomically (thread-race-free, §14).

The shell's `ls > out.txt` is exactly (§05's minish gap, now filled):

```c
pid_t c = fork();
if (c == 0) {
    int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    dup2(fd, STDOUT_FILENO);   // 1 now aliases the file's description
    close(fd);                 // the alias (fd 1) keeps it alive
    execlp("ls", "ls", NULL);  // ls writes fd 1, lands in out.txt, none the wiser
}
waitpid(c, ...);
```

▶ **Code:** `code/redirect.c` — this program, runnable, diffed against the
real shell's output in experiment 03. (§05 exercise 4, solved.)

## 4. `fork` vs `open` vs `dup`: the sharing matrix (predict, then verify)

| Operation | New fd? | New description? | Offset shared with original? |
|-----------|---------|------------------|------------------------------|
| `open()` same path again | yes | YES | **no** (independent offset — two readers don't disturb each other) |
| `dup()` / `dup2()` | yes | no (alias!) | **yes** (one offset — `lseek` on either moves both) |
| `fork()` | yes (copy of table) | no (same ones!) | **yes** (parent+child interleave through one offset) |
| `execve()` | kept (minus `CLOEXEC`) | same | yes (it's the same table) |

▶ **Code:** `code/fdchain.c` — one file, three handles (`open`+`open`+`dup`),
proving the matrix with `lseek(SEEK_CUR)` readings.
▶ **Code:** `code/forkshare.c` — parent and child `write()` the same fd
alternately: output interleaves byte-perfect (shared offset) instead of
overwriting. Then re-run with separate `open()`s: chaos (each keeps offset 0,
last writer wins per position).

## 5. `close`, `CLOEXEC`, and leaks

- `close(fd)` drops the fd → decrements the description's refcount → at zero,
  the kernel releases it (for files: nothing flushed — the kernel was never
  buffering *your* stdio; `fflush` first! §05's lesson returns).
- Double-`close` / `close` of a reused fd number = classic bug (you close
  someone else's file — §36's crash labs feature it).
- `O_CLOEXEC` / `FD_CLOEXEC`: "don't inherit across `exec`". Daemons and
  libraries set it so children don't inherit (and hold open!) fds they
  shouldn't — the infamous "why won't my log rotate" / "port still bound"
  mysteries. Always default to `CLOEXEC` unless you mean to pass the fd
  (like a shell does for 0/1/2).
- Limits: `RLIMIT_NOFILE` (`ulimit -n`, often 1024) → `EMFILE` (yours);
  system-wide exhaustion → `ENFILE`. Leaking fds in a long-lived server =
  eventual `EMFILE` death. Watch yours: `ls /proc/self/fd | wc -l`.

## 6. Everything is an fd (the uniform interface, §01 pays off)

Pipes (§17), sockets (§19), `epoll` instances (§21), `signalfd` (§07),
`inotify` (§09 footnote), `eventfd`, `timerfd`, even another process's
`pidfd` (§05's `CLONE_PIDFD`) — all fds, all `read`/`write`/`poll`/`close`.
`select`/`poll`/`epoll` work on (almost) all of them BECAUSE they're all fds.
Learn one interface, get a dozen subsystems.

Two meta-fds worth knowing: `/dev/fd/N` (re-open fd N — `echo hi > /dev/fd/2`
prints to stderr) and `/proc/self/fdinfo/N` (offset + flags, as text —
`fdchain.c`'s claims, externally verifiable).

## 7. stdio vs raw fds (the two layers, don't mix blindly)

`FILE *f = fopen(…)` wraps an fd (`fileno(f)` reveals it); `fdopen(fd, …)`
goes the other way. Rules:

1. **stdio buffers; syscalls don't.** `printf` without `\n`/flush may sit in
   user space while your `write()` to the same fd jumps ahead of it.
2. After `fork`, the child inherits the BUFFER (flush first — §05).
3. After `dup2` games, stdio doesn't care (it writes the fd number) — which
   is exactly why redirection is transparent to programs.
4. Mixing `read()` with `fread()` on the same description corrupts the
   stdio buffer's model of the offset. Pick one layer per fd.

▶ **Reference:** [notes/stdio-vs-fd.md](notes/stdio-vs-fd.md). ▶ **Reference:**
[notes/fd-semantics.md](notes/fd-semantics.md) — `CLOEXEC`, `close` edge
cases, `fcntl`, `EMFILE`, `close_range`.

---

## Experiments

```bash
cd experiments/
./01-fd-table-tour.sh     # grow/shrink YOUR shell's fd table live (pure bash)
./02-offset-lab.sh        # fdchain + forkshare: the sharing matrix, proven
./03-redirect-by-hand.sh  # redirect.c vs real shell: diffed, identical
```

## Build the code

```bash
cd code/
make
./fdchain
./forkshare
./redirect /bin/echo hello-fd; echo "--- file says:"; cat redirect-out.txt
```

## Exercises

1. `./forkshare` twice: same output order? (Scheduling decides interleaving —
   §06. The BYTES never corrupt though — why? Each `write` under `PIPE_BUF`…
   no wait, that's pipes. For regular files: shared offset + kernel-atomic
   offset update. §15 makes "atomic" rigorous.)
2. In `redirect.c`, what breaks if you `close(fd)` BEFORE `dup2`? What if you
   skip `close(fd)` after? (First: `dup2` fails `EBADF`. Second: harmless leak
   — but daemons doing this per-connection die of `EMFILE`.)
3. `ls -l /proc/$$/fd` then `exec 5>/tmp/x` then again. Explain fd 5's entry.
   Now `echo hi >&5; cat /tmp/x`. You just did redirection manually.
4. `strace -e trace=dup2,openat,close ./redirect /bin/true` (or mini-strace):
   find the `openat`→`dup2`→`close`→`execve` sequence. That's the shell's
   `>` in four syscalls.
5. `ulimit -n 32; ./fdchain` — what changes? (Nothing — it uses ~5 fds.
   Now write the loop that opens until `EMFILE` and reports the count. It's
   `ulimit -n` minus the 3 std + a few. Section 22's fd exhaustion story.)
6. (Think) Why is `FD_CLOEXEC` stored on the **fd**, while `O_APPEND` lives
   on the **description**? (Because after `dup`, both aliases must append
   together — but `exec` inheritance is per-alias: the shell's fd 1 passes
   through while its private fd 5 doesn't.)

## Further reading (in this track)

- Next: [09 — Files and Filesystems](../09-files-and-filesystems/) — inodes,
  links, VFS, mounts: what the fd chain points AT.
- Reference: [notes/open-flags.md](notes/open-flags.md),
  [notes/fd-semantics.md](notes/fd-semantics.md),
  [notes/stdio-vs-fd.md](notes/stdio-vs-fd.md).
- Diagrams: [diagrams/fd-chain.md](diagrams/fd-chain.md).
