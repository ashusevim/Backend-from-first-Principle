# ELF Fields: Ehdr, Phdr, and the classic sections

Reference for §12.1–12.2. What `readelf` prints, translated.

## ELF header (Ehdr — 64 bytes, `readelf -h`)

| Field | Meaning | `/bin/true` says |
|-------|---------|------------------|
| `e_ident[0..3]` | magic `7f 'E' 'L' 'F'` | the kernel's binfmt switch keys on this |
| `e_ident[EI_CLASS]` | 32/64-bit | 64 |
| `e_ident[EI_DATA]` | LSB/MSB | LSB (x86) |
| `e_ident[EI_OSABI]` | ABI flavor | System V (0) |
| `e_type` | REL/EXEC/DYN | DYN = PIE (ASLR-able, §12.4) |
| `e_machine` | ISA | X86-64 (62) |
| `e_entry` | first RIP | 0x23d0 = `_start`, NOT `main` |
| `e_phoff`/`e_phnum` | program-header table | 64 / 13 |
| `e_shoff`/`e_shnum` | section-header table | linker's index (§12.1) |

## Program headers (Phdr — `readelf -lW`, the LOADER's view)

One line per segment: `Type Offset VirtAddr FileSiz MemSiz Flags Align`.
The loader `mmap`s each `LOAD` (file-backed, `MAP_PRIVATE`): `R E` →
`exe-text`, `R` → `exe-ro`, `RW` → `exe-data`. **`MemSiz > FileSiz` =
`.bss`**: the kernel zero-fills the gap (free zero pages, zero file bytes).
`INTERP` names the loader; `DYNAMIC` feeds it; `GNU_RELRO` marks the region
`ld.so` re-protects read-only after relocating (exploit mitigation);
`GNU_STACK` with `RWE`?? = executable stack requested (rare, scary —
`true` says `RW`, good).

## Section headers (Shdr — `readelf -S`, the LINKER's view)

| Section | Holds | Lands in segment |
|---------|-------|------------------|
| `.text` | machine code | LOAD R E |
| `.rodata` | constants, string literals | LOAD R |
| `.eh_frame` | unwinding tables (backtraces, C++ exceptions) | LOAD R (EHFRM) |
| `.data` | initialized globals/statics | LOAD RW |
| `.bss` | UNinitialized globals (`FileSiz 0`!) | the memsz gap |
| `.symtab`/`.strtab` | symbols + names (`strip` deletes) | NOT loaded (no LOAD covers them) |
| `.debug_*` | DWARF (gdb's food, §36) | not loaded |
| `.interp` | `/lib64/ld-linux…` string | INTERP |
| `.dynamic` | DYNAMIC tags (NEEDED, …) | DYNAMIC |
| `.got`/`.got.plt` | GOT slots (§13's stars) | LOAD RW (+ RELRO after) |

Rule: sections are for tools (`strip`, `gdb`, `perf`); segments are for
RUNNING. A binary can even run with its section table stripped — the
kernel never looks at it.
