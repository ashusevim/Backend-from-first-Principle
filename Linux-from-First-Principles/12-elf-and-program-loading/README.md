# 12 — ELF and Program Loading

**Question this section answers:** *How does `./a.out` become a process —
what's actually inside that file, and who builds the §10 floor plan from it?*

By the end you can: read an ELF header cold; predict a process's map from
its program headers; explain `execve`'s kernel-side rebuild; and prove ASLR
by watching addresses dance across runs.

---

## 1. ELF: two views of one file

An ELF file serves two readers: the LINKER (sections: `.text`, `.rodata`,
`.data`, `.bss`, `.symtab`…) and the LOADER (segments: `LOAD`, `INTERP`,
`DYNAMIC`…). Sections say "what the compiler made"; segments say "what to
`mmap` where". `readelf -S` shows the linker's view; `readelf -l` shows
the loader's — and §2 proves the loader's view BECOMES the process map.

The ELF header (first 64 bytes): magic `7f E L F`, class (64-bit),
endianness, ABI, type (`EXEC` = fixed load address, `DYN` = PIE/shared,
relocatable), machine (`x86-64`), **entry point** (where the kernel jumps
— usually `_start`, NOT `main`!).

▶ **Code:** `code/elfhead.c` — parses header + program headers BY HAND
(no libelf): magic, type, entry, every `LOAD` (file-offset → vaddr →
memsize → flags). Its output predicts `maps` — experiment 01 checks.

## 2. Segments become mappings (LOAD → VMA)

Each `PT_LOAD` says: copy file bytes `[offset, offset+filesz)` to virtual
`vaddr`, zero-fill to `memsz` (`.bss` lives in that gap — zero pages that
cost no file bytes!), with `RWE` flags. The kernel `mmap`s them
(`MAP_PRIVATE`, file-backed, copy-on-write — §10.7's machinery loading
§09's files!). Typical x86-64 PIE binary:

| Segment | Flags | Becomes (§10.6 classes) |
|---------|-------|------------------------|
| LOAD #1 (text) | R E | `exe-text` (`r-xp`) |
| LOAD #2 (rodata) | R | `exe-ro` (`r--p`) |
| LOAD #3 (data+bss) | RW | `exe-data` (`rw-p`) |
| INTERP | R | path of the dynamic loader (`/lib64/ld-linux…`) — §13's star |
| DYNAMIC | RW | tags the loader reads (NEEDED libs, symbol tables…) |
| NOTE/GNU_* | — | build-id, ABI notes, RELRO bounds, stack-executable? |

`readelf -lW` + `./maps <pid>` side by side: same addresses (modulo the
PIE slide — §4). If they ever disagree, the loader is lying or you're
reading the wrong process.

▶ **Reference:** [notes/elf-fields.md](notes/elf-fields.md) — every header
field, every classic section, `filesz`-vs-`memsz` (the `.bss` trick).
▶ **Diagram:** [diagrams/elf-to-process.md](diagrams/elf-to-process.md).

## 3. `execve`: the kernel rebuilds you

`execve(path, argv, envp)` doesn't create a process — it REPLACED the
caller's entire user half (§05: fork first, THEN exec). Kernel-side
(`fs/binfmt_elf.c`, ~2k lines you'll read in §37):

1. Open + verify ELF magic; pick `binfmt_elf` (shebang → `binfmt_script`,
   misc → `binfmt_misc`, a.out → museum).
2. `flush_old_exec`: unmap ALL user VMAs (§10's floor plan demolished),
   reset signals (§07), close `O_CLOEXEC` fds (§08 — the flag's whole point!).
3. `mmap` every `PT_LOAD` at `vaddr + load_bias` (bias = 0 for `EXEC`,
   random per-run for PIE — §4).
4. If `PT_INTERP`: mmap the LOADER (`ld.so`) too, and set the entry to the
   LOADER's entry (your `_start` waits — §13 runs first!).
5. Build the stack: `argc/argv/envp` strings + pointers + **auxv** (kernel→
   process handoff: `AT_ENTRY`, `AT_PHDR`, `AT_RANDOM`, `AT_EXECFN`…).
6. `start_thread`: set RIP = entry, RSP = stack top, wipe registers. Return
   "to userspace" — a newborn that never made a syscall.

ALL of this happens INSIDE one `execve` — invisible to `strace` (which only
sees the before/after). Experiment 02 shows the seam: the trace jumps from
`execve(...)` to post-birth syscalls with the entire construction hidden.

▶ **Code:** `code/auxv.c` — dumps `/proc/self/auxv` decoded
(`AT_ENTRY` = YOUR entry, `AT_RANDOM` = stack canary seed…) + cross-checks
`getauxval`. The kernel's birth letter, read aloud.
▶ **Reference:** [notes/loading-sequence.md](notes/loading-sequence.md).

## 4. ASLR: same binary, different addresses every run

Position-Independent Executables (`ET_DYN` + `PIE`, the distro default)
load at a RANDOM base each run; so do `mmap`s (libc, loader), stack, and
vdso. Entropy source: `AT_RANDOM` (16 kernel bytes on the stack) +
per-VMA slides. Knob: `/proc/sys/kernel/randomize_va_space` (0 off, 1
mmap/stack/libc, 2 + brk — this machine: FULL).

▶ **Code:** `code/addrs.c` — prints `main`'s address, a stack var, a heap
chunk, `printf`'s (libc) address. Run 5×: everything dances. `setarch -R`
(disables randomization for one run): frozen. Experiment 03 runs both +
shows `checksec`-style verdicts via `readelf -h` (Type: DYN = PIE ✓).

Why care (beyond exploits): UNREPRODUCIBLE addresses break naive debugging
("it crashed at 0x55…") — always resolve against `/proc/PID/maps`, never
trust an address across runs. §36 leans on this.

## 5. Static vs dynamic (the fork before §13)

| | Static (`gcc -static`) | Dynamic (default) |
|---|---|---|
| `PT_INTERP` | absent — kernel jumps to YOUR entry | present — kernel jumps to `ld.so` |
| Libc | copied INTO the binary (~1 MB) | `mmap`'d from `/usr/lib` (shared, §10) |
| Size | huge, self-contained | tiny, needs its libs present |
| Startup | straight to `_start` | loader maps + relocates first (§13!) |

Both are honest engineering: static wins deployability (containers,
rescue), dynamic wins memory + security updates (one libc patch fixes
all). `ldd` on a static binary says "not a dynamic executable" — the
experiment proves it both ways.

---

## Experiments

```bash
cd experiments/
./01-read-an-elf.sh        # readelf -h/-l/-S vs elfhead: three views agree
./02-exec-to-process.sh    # execve seam under mini_strace + auxv birth letter
./03-aslr.sh               # addrs x5 (dance) vs setarch -R (frozen)
```

## Build the code

```bash
cd code/
make
./elfhead /bin/true
./auxv | head -20
./addrs
```

## Exercises

1. `readelf -lW /bin/true` → note the LOAD vaddrs. `./addrs`-style: write
   5 lines printing `&main`, run under `setarch -R`, and compute the PIE
   slide (`actual − readelf-vaddr`, constant within a run, random across).
2. `.bss` is free: `int big[1<<20];` (4 MiB BSS) vs `= {1}` (4 MiB DATA).
   Compare binary sizes + `readelf -S` sizes. (BSS: filesz 0, memsz 4M.)
3. `strace -f -e trace=execve,openat,mmap gcc --version | head` — find the
   `ld.so` mmaps (ld.so mapping LIBC — userspace work, visible!) and say
   which mappings came from INSIDE execve (the binary's own LOADs —
   invisible). (Here: `mini_strace`.)
4. Break ASLR's assumption: `setarch -R ./addrs` twice — identical. Now
   explain why containers/CI sometimes disable it (reproducible
   debugging, cursed old JITs) and why you shouldn't on servers.
5. `readelf -d /bin/true | grep NEEDED` — list the libs. Then
   `/lib64/ld-linux-x86-64.so.2 --list /bin/true` (= `ldd`, §13 preview).
   Delete nothing; observe everything.
6. (Think) `_start` is the entry, not `main` — who calls `main`, and with
   what stack? (Answer: libc's `__libc_start_main` —
   `_start` (from `crt1.o`) → `__libc_start_main` → YOUR `main(argc,
   argv, envp)` + `exit(ret)`. `main` returning is `exit()`-ing.)

## Further reading (in this track)

- Next: [13 — Dynamic Linking](../13-dynamic-linking/) *(coming soon)* —
  `ld.so`, GOT/PLT, lazy binding: everything `PT_INTERP` promised.
- Back: [10 — Virtual Memory](../10-virtual-memory/) (the floor plan the
  loader furnishes), [05 — Process Creation](../05-process-creation/)
  (fork+exec split), [03 — System Calls](../03-system-calls/) (tracer).
- Reference: [notes/elf-fields.md](notes/elf-fields.md),
  [notes/loading-sequence.md](notes/loading-sequence.md).
- Diagrams: [diagrams/elf-to-process.md](diagrams/elf-to-process.md).
