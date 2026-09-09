# Notes — `waitpid` status macros & options

## The status word (an `int` packed by the kernel)

Never read it raw — use the macros (`<sys/wait.h>`):

| Macro | True when | Companion |
|-------|-----------|-----------|
| `WIFEXITED(s)` | child called `exit`/`_exit` (or returned from `main`) | `WEXITSTATUS(s)` → low 8 bits (0–255!) |
| `WIFSIGNALED(s)` | child died from a signal | `WTERMSIG(s)` → signal number; `WCOREDUMP(s)` → core dumped? |
| `WIFSTOPPED(s)` | child stopped (needs `WUNTRACED`) | `WSTOPSIG(s)` → the stop signal |
| `WIFCONTINUED(s)` | child resumed via `SIGCONT` (needs `WCONTINUED`) | — |

Notes:

- **Exit codes are 8 bits.** `exit(1000)` → parent sees `1000 & 255 = 232`.
  `exit(-1)` → `255`. Conventions: `0` ok, `1` generic error, `2` misuse,
  `126` not executable, `127` not found (shells honor these — so does minish).
- Signals reported: `1` SIGHUP, `2` SIGINT, `9` SIGKILL, `11` SIGSEGV,
  `15` SIGTERM… (`kill -l` lists all; §07 explains each.)
- `WCOREDUMP` is glibc-only (not POSIX) — fine on Linux.

## `waitpid` options (OR them)

| Option | Effect |
|--------|--------|
| `0` | block until a child exits (or stops, if traced) |
| `WNOHANG` | don't block: return `0` if no child is ready (polling / reaping bg jobs) |
| `WUNTRACED` | also return on stops (`WIFSTOPPED`) — job control needs this |
| `WCONTINUED` | also return on `SIGCONT` resumes |

## `wait` vs `waitpid`

- `wait(&s)` ≡ `waitpid(-1, &s, 0)` — any child, blocking.
- `waitpid(pid, …)` — that child. `waitpid(-1, …)` — any child.
  `waitpid(0, …)` — any child in MY process group. `waitpid(-pgid, …)` —
  any child in group `pgid`.
- Returns: reaped PID; `0` (only with `WNOHANG`, none ready); `-1` with
  `ECHILD` (no (more) children) or `EINTR` (a signal interrupted the wait —
  **retry the call**).

## Rules of thumb

1. Every `fork` needs a matching `wait` (or `SIG_IGN` for `SIGCHLD`, or a
   `SIGCHLD` handler that reaps — §07). No exceptions; orphans-zombies pile.
2. A blocking `waitpid` in a loop must handle `EINTR` (signals!) — retry.
3. Reap background jobs opportunistically: `while (waitpid(-1, &s, WNOHANG) > 0)`.
   (minish does exactly this each prompt.)
