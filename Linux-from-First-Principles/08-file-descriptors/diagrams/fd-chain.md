# Diagrams — The fd chain and what each op does to it

## The three levels (fd → description → inode)

```text
PROCESS A (fd table)         OPEN FILE TABLE            INODE TABLE
────────────────────         ───────────────            ───────────
fd 0 ──┐
fd 1 ──┼──▶ [desc X] ────────────────────┐
fd 2 ──┘     {off: 1530, O_RDWR}          │
                                          ▼
fd 5 ──────▶ [desc Y] ──────────────▶ [inode 1234] ──▶ ext4 file "log"
             {off: 0, O_RDONLY}            (nlink, size,
                                           blocks, ops)
PROCESS B (its own table)
─────────────────────────
fd 3 ──────▶ [desc Z] ───▶ (same inode 1234, SEPARATE offset!)
             {off: 99,...}
```

## What each operation creates (● = new, ○ = shared)

```text
               new fd?    new description?    offset shared?
open()           ●              ●                  no
open() again     ●              ●                  no (independent!)
dup()/dup2()     ●              ○                  YES
fork()         (copy)           ○                  YES (cross-process!)
execve()       (kept*)          ○                  YES
close()        (removes fd; description freed at refcount 0)

* minus FD_CLOEXEC ones
```

## Redirection in four syscalls (`ls > out.txt`)

```text
shell forks ──▶ child:
                  open("out.txt", WRONLY|CREAT|TRUNC) ──▶ fd 3 ──▶ [desc F]
                  dup2(3, 1) ──▶ fd 1 ──▶ [desc F]  (old stdout closed;
                  close(3)                                  desc F refcount
                                                            back to 1: fd 1)
                  execve("ls") ──▶ ls writes fd 1 ──▶ [desc F] ──▶ out.txt
shell waits ──▶ exit status (fd 1 of the SHELL untouched throughout)
```

## The ancient trick (why lowest-free-fd matters)

```text
close(1); open("out.txt", O_WRONLY);   ──▶ open returns 1 (!!)
   │                                         (lowest free number)
   └── stdout is now the file — no dup2 needed. This is how the
       Thompson shell did it in 1971. dup2() just made it atomic.
```
