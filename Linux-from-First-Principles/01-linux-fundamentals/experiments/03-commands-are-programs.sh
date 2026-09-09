#!/usr/bin/env bash
# 03-commands-are-programs.sh — builtins vs external programs, and WHY.
# Run: ./03-commands-are-programs.sh
set -u
say() { printf '\n=== %s ===\n' "$*"; }

say "1. Most commands are just files in PATH"
for c in ls cat ps uname; do printf '%-6s -> %s\n' "$c" "$(type -p "$c")"; done
if command -v file >/dev/null; then file "$(type -p ls)"; else echo "(install 'file' to see the ELF type of /usr/bin/ls — Section 12)"; fi

say "2. ...but a few MUST live inside the shell (builtins)"
for c in cd echo export kill type; do printf '%-6s -> %s\n' "$c" "$(type -t "$c")"; done

say "3. Why cd cannot be an external program"
echo "A child process cannot change its PARENT's directory (each process has"
echo "its own cwd in its task_struct). So cd must be a builtin: the shell"
echo "calls chdir() on itself. Proof that external cd would be useless:"
bash -c 'cd /tmp'   # runs in a subshell...
pwd                 # ...and our cwd is unchanged.

say "4. Builtins skip fork+exec entirely (fast path)"
echo "type 'echo': $(type -t echo) — the shell just calls write(), no new process."
echo "Compare: 'which echo' may show /bin/echo (external fallback for scripts)."

say "5. Takeaway"
echo "shell builtin  = function call inside bash (chdir, write, ...)"
echo "external cmd   = fork + exec + wait (Section 05 builds this: mini-shell)"
