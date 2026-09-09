# Diagrams — System layers & command flow

## The three layers

```text
┌──────────────────────────────────────────────────────────┐
│ USER SPACE  (unprivileged, many processes)               │
│                                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐         your programs       │
│  │ bash │  │  ls  │  │nginx │  ...   link libc            │
│  └──┬───┘  └──┬───┘  └──┬───┘                             │
│     │         │         │      ═══ system-call gate ═══   │
├─────┼─────────┼─────────┼────────────────────────────────┤
│     ▼         ▼         ▼                                │
│ KERNEL SPACE  (privileged, one kernel)                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │ syscall layer │ scheduler │ mm │ VFS │ net │ drv │    │
│  └──────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────┤
│ HARDWARE  CPU │ RAM │ disk │ NIC                          │
└──────────────────────────────────────────────────────────┘
```

## A command's journey (`cat /etc/hostname`)

```text
terminal ──bytes──▶ bash ──fork──▶ bash(copy) ──execve──▶ cat
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         ▼                         │
                              │              open("/etc/hostname")  ──▶ VFS ──▶ disk driver
                              │                         │                         │
                              │              read() ◀───┼── bytes ────────────────┘
                              │                         │
                              │              write(stdout) ──▶ pty ──▶ terminal draws text
                              │                         │
                              │              exit_group() ──▶ bash's waitpid() returns
                              ▼
                     KERNEL (does all privileged work)
```

## Everything-is-a-file, one interface

```text
                    ┌─────────┐
                    │ program │  read(fd, buf, n)
                    └────┬────┘
                         │  fd 0 ──▶ terminal (/dev/pts/N)
              same       │  fd 3 ──▶ regular file on ext4
              read()     │  fd 4 ──▶ /proc/self/status (kernel-generated)
              for all    │  fd 5 ──▶ pipe to another process
                         │  fd 6 ──▶ TCP socket
                         ▼
              ┌─────────────────────┐
              │  kernel: VFS +      │
              │  per-type drivers   │
              └─────────────────────┘
```
