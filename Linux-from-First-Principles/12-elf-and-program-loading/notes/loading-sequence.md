# Loading Sequence: inside one `execve` (~2k lines of `binfmt_elf.c`)

Reference for §12.3. The six acts from §12.3, with the function names
you'll meet in §37's source tour.

1. **Identify** — `open_exec` + `prepare_binprm`: read the first bytes,
   match magic → `linux_binfmt` (`elf_format` here; `#!` → script format;
   `:`-rules → `binfmt_misc` — how Java/Python/Wine binaries "just run").
2. **Demolish** — `flush_old_exec`: unmap every user VMA (the §10 floor
   plan goes to zero), reset signal handlers to default (§07 — YOUR
   handlers don't survive exec!), close `O_CLOEXEC` fds (§08), drop
   suid-risk state (`AT_SECURE` set when honoring it matters).
3. **Map** — `elf_map` per `PT_LOAD`: file-backed `MAP_PRIVATE` mmaps at
   `vaddr + load_bias` (bias 0 for `EXEC`, random for PIE — §12.4);
   `.bss` gap zero-filled (demand-zero pages, §10.4's minor faults).
4. **Loader** — if `PT_INTERP`: `open` + map `ld.so`, entry := LOADER's
   entry. (No INTERP = static: entry := YOUR `_start`, skip to 6.)
   `create_elf_tables` then builds argc/argv/envp/auxv on the fresh stack.
5. **Stack + auxv** — strings, pointer arrays, then the aux vector:
   `AT_ENTRY` (your real entry, for the loader's final jump),
   `AT_PHDR/ENT/NUM` (find your own program headers!), `AT_BASE`
   (loader's address), `AT_RANDOM` (16 bytes: canary seed + ASLR salt),
   `AT_EXECFN`, `AT_UID/GID…`, `AT_PAGESZ`, `AT_CLKTCK`, `AT_HWCAP*`
   (CPU features — see `code/auxv.c` read them all).
6. **Birth** — `start_thread`: RIP = entry, RSP = stack top, registers
   scrubbed. The syscall "returns" into userspace code that never called
   anything. First userspace instructions: `ld.so`'s bootstrap (§13) or
   your `_start` → `__libc_start_main` → `main` → `exit`.

**The strace seam**: steps 1–6 happen INSIDE `execve` — a tracer sees the
call go in (old process) and the NEXT syscall come out (new process).
Everything between is kernel-side. The loader's OWN work (mapping libc,
relocating — §13) happens AFTER, in userspace, and IS visible.
