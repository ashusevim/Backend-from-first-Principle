#!/usr/bin/env bash
# 02-errno-lab.sh — Fail on purpose; read errno at every layer.
# Run: ./02-errno-lab.sh   (from this directory)
set -u
say() { printf '\n=== %s ===\n' "$*"; }
CODE="../code"

say "0. Building"
make -C "$CODE" errno_demo 2>&1 | grep -E 'warning|error' && echo "BUILD HAS WARNINGS" || echo "build clean"

say "1. The demo: one missing file, three views of the error"
"$CODE/errno_demo"

say "2. Where the numbers live (kernel header, installed on your box)"
grep -E '#define[[:space:]]+(ENOENT|EACCES|EPERM|EBADF|EINVAL)[[:space:]]' /usr/include/asm-generic/errno-base.h

say "3. Takeaway"
echo "kernel: rax = -2  →  libc: errno = 2, return -1  →  you: strerror/perror."
echo "The kernel only ever sends the NUMBER; all words come from libc."
