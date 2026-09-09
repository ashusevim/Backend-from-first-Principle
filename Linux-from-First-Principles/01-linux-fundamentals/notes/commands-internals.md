# Notes — What common commands do internally

One-line mechanism map. Each row names the primary syscalls / kernel
interfaces; the linked section explains them fully.

| Command | Mechanism | Deep dive |
|---------|-----------|-----------|
| `ps` | read + parse `/proc/<pid>/{stat,status,cmdline}` | §22 |
| `top` / `htop` | poll `/proc/stat`, `/proc/<pid>/stat` in a loop; diff jiffies | §22, §06 |
| `ls` | `open(dir)` → `getdents64` → `stat`/`lstat` per entry | §09 |
| `cat` | `open` → `read` loop → `write` to fd 1 | §08 |
| `echo` | shell builtin: `write(1, ...)`; no fork/exec | §05 |
| `cd` | shell builtin: `chdir()` — must be builtin (a child can't change the parent's cwd) | §05 |
| `pwd` | libc `getcwd()` syscall | §09 |
| `env` / `printenv` | dump the process's `envp` (from `execve`) | §12 |
| `export FOO=bar` | shell builtin: edits its own `environ`, inherited by children at fork | §05 |
| `uname -a` | `uname()` syscall — one call, kernel fills `struct utsname` | §03 |
| `whoami` | `geteuid()` → name lookup in `/etc/passwd` (via nss) | §23 |
| `id` | `getuid/geteuid/getgid/getgroups` + group db lookups | §23 |
| `kill <pid>` | `kill()` syscall — sends a signal; "kill" is a misnomer | §07 |
| `ls -l /proc/$$/fd` | kernel renders the process's fd table as symlinks | §08, §22 |
| `cat /proc/cpuinfo` | kernel generates text from CPU descriptors at `read()` time | §22 |
| `df` | `statfs()` per mount | §09 |
| `du` | recursive `getdents` + `stat`, sums `st_blocks` | §09 |
| `mount` | reads `/proc/self/mountinfo` (display) / `mount()` syscall (action) | §09 |
| `ss -tln` | netlink query (`NETLINK_SOCK_DIAG`) to TCP stack | §20 |
| `ip addr` | netlink `RTM_GETADDR` query | §20 |

## Key insight (repeated until obvious)

User-space tools are **formatters over kernel interfaces**. The kernel owns
the truth (`task_struct`, fd tables, mount tables, socket tables); tools ask
via **syscalls** (`getdents`, `read`, `uname`) or **virtual filesystems**
(`/proc`, `/sys`) and pretty-print the answer. There is no third channel —
which means you can reimplement any of these tools yourself. And you will
(§38 Mini Projects).
