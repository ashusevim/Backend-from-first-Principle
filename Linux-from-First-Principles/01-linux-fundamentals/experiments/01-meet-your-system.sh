#!/usr/bin/env bash
# 01-meet-your-system.sh — Meet the machine: kernel, identity, processes.
# Run: ./01-meet-your-system.sh
set -u
say() { printf '\n=== %s ===\n' "$*"; }

say "1. The kernel (uname = one uname() syscall + formatting)"
uname -a

say "2. Your identity (id = getuid/getgid syscalls + /etc/passwd lookup)"
id

say "3. This shell is a process too (PID $$, parent $PPID)"
ps -o pid,ppid,stat,cmd -p $$ -p $PPID

say "4. Your process's environment (inherited via fork, set at execve)"
env | head -8
echo "   ... ($(env | wc -l) variables total)"

say "5. Takeaway"
echo "Every answer above came from the kernel (syscall or /proc) plus formatting."
echo "In section 22 you will reimplement ps yourself."
