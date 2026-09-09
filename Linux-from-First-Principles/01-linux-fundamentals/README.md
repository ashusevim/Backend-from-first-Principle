# 01 — Linux Fundamentals

**Question this section answers:** *When I type a command, what pieces of the
system are actually involved — and what does each one do?*

By the end you will be able to draw the full path of a command from keypress
to kernel and back, and explain what `ps`, `ls`, `cat`, `uname`, `id`, and
`env` are *really* doing.

---

## 1. What "Linux" actually is

People say "I run Linux" and mean four different things. Separate them:

| Term | What it is | Example |
|------|-----------|---------|
| **Linux kernel** | One program (written mostly in C) that manages CPU, memory, devices, processes. It is the *only* program allowed to touch hardware directly. | `vmlinuz-6.1.0-...` booted by your machine |
| **GNU userland** | The standard tools (shell, `ls`, `cp`, compiler toolchain, C library…) that make the kernel usable. | `bash`, `coreutils`, `glibc` |
| **Distribution** | Kernel + userland + package manager + defaults, shipped as one product. | Debian, Fedora, Arch, Ubuntu |
| **Operating system** | The whole working combination above. | What you actually boot |

So the precise sentence is: **Linux is a kernel; GNU/Linux distributions are
operating systems built on it.** When this track says "Linux does X", it means
*the kernel* does X — unless stated otherwise.

Why does this matter? Because the kernel/userland split is the single most
important boundary in this entire track (all of Section 02). Every strange
behavior you'll meet — permissions, syscalls, `/proc`, containers — exists
because of where that line is drawn.

```text
┌─────────────────────────────────────────────┐
│  USERLAND  (many programs, unprivileged)    │
│  bash, ls, nginx, postgres, your code ...   │
│  linked against libc (glibc/musl)           │
├────────────────── boundary ─────────────────┤
│  KERNEL  (one program, privileged)          │
│  processes │ memory │ files │ net │ drivers │
├─────────────────────────────────────────────┤
│  HARDWARE  CPU, RAM, disk, NIC              │
└─────────────────────────────────────────────┘
```

## 2. Kernel space vs user space (first look)

- The CPU has **privilege levels**. Code running in *kernel mode* can execute
  any instruction (talk to disks, reprogram memory mappings...). Code in *user
  mode* cannot — attempting a privileged operation faults.
- Your programs (including `bash` and `ls`) run in **user space**. The kernel
  runs in **kernel space**.
- A user program that needs something privileged (read a file, create a
  process, send a packet) must **ask the kernel** via a **system call** — a
  controlled gate between the two worlds.

```text
you type:  cat /etc/hostname
     │
     ▼
┌─────────┐   fork+exec   ┌─────────┐   open/read/write   ┌────────┐
│  bash   │ ───────────▶  │   cat   │ ──────────────────▶ │ kernel │ ─▶ disk
│ (user)  │               │ (user)  │   ◀── bytes ─────── │        │
└─────────┘               └─────────┘                     └────────┘
```

Notice: `cat` itself never touches the disk. It *asks*, the kernel *does*.
Hold onto that idea — Sections 02–03 make it concrete, and Section 08 traces
a single `read()` all the way down to storage.

## 3. Shell, terminal, CLI

Three things beginners blur together:

- **Terminal** — the program (or hardware, historically) that draws text and
  sends keystrokes. Examples: GNOME Terminal, `xterm`, your SSH client. It
  emulates the old physical terminals (`/dev/pts/*` — and yes, those are files;
  see §5).
- **Shell** — a normal user-space program that reads lines of text, parses
  them, and launches other programs (`fork` + `exec`, Section 05). Examples:
  `bash`, `zsh`, `fish`.
- **CLI** — not a program at all: the *style* of interacting via text commands
  instead of clicking.

Why a shell at all — why not click everything? Because the shell is a
**programming language for composing programs**: pipes, redirection, loops,
and scripts turn one-shot commands into automation. Sections 05 (mini-shell),
08 (redirection), and 17 (pipes) each implement one piece of it, until you've
essentially rebuilt `bash`'s core yourself.

▶ **Experiment:** `experiments/03-commands-are-programs.sh` — prove that most
commands are just files in `/bin`, while a few (`cd`, `echo` sometimes) are
built into the shell, and learn *why* each choice exists.

## 4. The four abstractions everything is built from

The kernel exposes the whole machine through a tiny set of abstractions.
Everything in this track is one of these (or a composition of them):

1. **Processes** — a running program: code + memory + file descriptors +
   identity (UID/GID). Sections 04–07, 14–15.
2. **Files** — a byte stream you `open`/`read`/`write`. Regular files,
   directories, devices, pipes, sockets are *all* accessed this way. (§5 below, Sections 08–09.)
3. **Memory** — each process gets its own *virtual* address space, mapped to
   physical RAM by the kernel. Sections 10–11.
4. **Sockets/Network** — endpoints for talking to other processes, local or
   remote. Sections 19–21.

If you ever feel lost later, come back to this list and ask which abstraction
you're looking at.

## 5. "Everything is a file"

Unix's most famous design decision: **one interface (`open`/`read`/`write`/
`close` on a file descriptor) for wildly different things.** Not because files
and hardware are similar — but because a *uniform interface* means every tool
works with everything: `cat` can print a file, a device, or kernel state; `ls`
can list a directory or your open connections' descriptors.

Concrete examples (try them — see `experiments/02-everything-is-a-file.sh`):

| Path | Looks like | Actually is |
|------|-----------|-------------|
| `/proc/$$/status` | a text file | kernel formatting *your shell's* process info on the fly (Section 22) |
| `/proc/$$/fd/0` | a symlink | your shell's stdin (a terminal, pipe, or file) |
| `/dev/null` | a file | a device driver that discards writes, returns EOF on read |
| `/dev/urandom` | a file | the kernel CSPRNG as a byte stream |
| `/sys/class/net/lo/operstate` | a file | one attribute of the loopback interface (Section 22) |

None of these bytes live on disk. When you `cat` them, the kernel *generates*
the content at read time. That is the payoff of the philosophy: **new kernel
features need no new tools** — they just appear as files.

▶ **Code:** `code/list_fds.c` lists a process's own open files by reading
`/proc/self/fd` — the same trick debuggers and `lsof` use.

## 6. What the basic commands *really* do

This is the "internals preview" for the whole track. Each command below is
covered in depth in its section; here, learn the *shape* of the answer.

| Command | What it looks like | What it really does |
|---------|-------------------|---------------------|
| `ps` | lists processes | reads `/proc/<pid>/stat`, `/proc/<pid>/cmdline`, … and formats them (§22) |
| `top` | live process view | re-reads `/proc` + `/proc/stat` in a loop, computes deltas |
| `ls` | lists files | `open()` dir → `getdents()` syscall → `stat()` each entry (§09) |
| `cat file` | prints a file | `open()` → loop `read()` → `write(stdout)` (§08) |
| `echo hi` | prints text | usually a shell builtin: no new process, just `write()` (§05) |
| `env` | prints variables | prints the `envp` array the kernel handed the process at `execve` (§12) |
| `uname -a` | system info | one `uname()` syscall + formatting (§03) |
| `whoami` / `id` | your identity | `getuid()`/`getgid()` syscalls, then looks up names in `/etc/passwd` (§23) |

The pattern to internalize: **commands don't contain magic — they call the
kernel and format the answer.** By Section 22 you'll reimplement half this
table yourself (`mini-ps`, `mini-ls`, `mini-cat`, `mini-top` are all in the
Mini Projects).

▶ **Code:** `code/identity.c` performs the `id`+`uname` lookups directly, and
`code/argenv.c` shows the `argv`/`envp` your process starts life with.

## 7. Putting it together: the life of a keypress

Type `ls` + Enter in a terminal. The full story (each arrow is expanded in its
section):

```text
keyboard
   │  (terminal emulator turns keypress into bytes on a pty)
   ▼
/dev/pts/N ──read──▶ bash ──parse──▶ "external command 'ls'"
   │                       │
   │                       ├── fork() ──▶ child process (a copy of bash)
   │                       │                    │
   │                       │                    ├── execve("/bin/ls") ──▶ kernel loads ELF,
   │                       │                    │                         builds address space (§12)
   │                       │                    ├── getdents() on "." ──▶ kernel reads
   │                       │                    │                         directory via VFS (§09)
   │                       │                    └── write() to stdout ──▶ bytes flow back
   │                       │                                              through the pty
   │                       └── waitpid() ──▶ bash sleeps until ls exits (§05)
   ▼
terminal draws the filenames
```

Count the crossings: your keystroke passed through a device file, two
processes, one program-load, and at least three system calls — in milliseconds.
The rest of this track is just this diagram, zoomed in, forty times over.

---

## Experiments (run these now)

```bash
cd experiments/
./01-meet-your-system.sh        # uname, id, ps, env: meet the machine
./02-everything-is-a-file.sh    # /proc, /dev, /sys are alive
./03-commands-are-programs.sh   # builtins vs external programs (and why)
```

## Build the code

```bash
cd code/
make
./identity
./argenv hello world
./list_fds
```

## Exercises

1. `ls -l /proc/$$/fd` — how many entries? For each, figure out *what* it points
   to (terminal? pipe?). Repeat after running `ls -l /proc/$$/fd | cat` and
   explain what changed and why. (Answer unlocks in Section 08.)
2. Run `cat /proc/self/status | head -5` twice. Which field changes every run?
   Why must it? (Hint: what is `self`?)
3. `type cd ls echo kill` — which are builtins? For each builtin, argue *why*
   it must be one. (Check your answers in Section 05.)
4. `strace -c true` if you have strace (else skip until Section 03's
   `mini-strace`): how many syscalls does doing *nothing* take? Where do they
   come from?

## Further reading (in this track)

- Next: [02 — User Space and Kernel](../02-user-space-and-kernel/) — the
  boundary this section only sketched.
- Reference: [notes/commands-internals.md](notes/commands-internals.md) —
  command → mechanism cheat sheet.
- Diagrams: [diagrams/system-layers.md](diagrams/system-layers.md).
