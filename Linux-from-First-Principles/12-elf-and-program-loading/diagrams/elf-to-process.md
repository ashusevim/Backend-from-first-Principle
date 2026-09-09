# ELF to Process: file bytes become a floor plan

Visual companion for §12.1–12.3. Left: the FILE (`readelf`). Right: the
PROCESS (`maps`). Middle: the kernel's `execve` construction.

```text
/bin/true (ET_DYN, entry 0x23d0)          execve                    PROCESS
─────────────────────────────    ──────────────────────    ─────────────────
Ehdr: magic, DYN, entry ─────────▶ verify magic, ET_DYN ──▶ load_bias=RANDOM
Phdr[LOAD R]  off 0x0 ───────────▶ mmap file-backed ──────▶ exe-ro   r--p
Phdr[LOAD R E] off 0x2000 ───────▶ mmap ───────────────────▶ exe-text r-xp
Phdr[LOAD R]  off 0x6000 ────────▶ mmap ───────────────────▶ exe-ro   r--p
Phdr[LOAD RW] off 0x7d70 ────────▶ mmap + zero memsz-gap ──▶ exe-data rw-p
  filesz 1136, memsz 1544         (+408 .bss zeros, free)     (bss = free zeros)
Phdr[INTERP] "/lib64/ld-linux" ──▶ ALSO mmap ld.so ────────▶ libc/loader maps
  entry := LOADER's entry!          (your _start waits)       (§13 runs first)
Phdr[DYNAMIC] ───────────────────▶ loader reads NEEDED ────▶ libc mmap'd (§13)
argv/envp/auxv ──────────────────▶ stack construction ─────▶ [stack] + AT_*
                                                              [vdso] [vvar]
```

ASLR visual (§12.4): re-run and the WHOLE right column slides — exe base
(`0x55…` ±), libc (`0x7f…` ±), stack (`0x7fff…` ±). `setarch -R` pins the
slide: exe always `0x555555554000`. The FILE never changes; only the bias.
