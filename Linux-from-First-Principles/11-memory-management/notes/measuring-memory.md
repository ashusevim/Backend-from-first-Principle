# Measuring Memory: the allocator's ledger + outside witnesses

Reference for §11.5. Inside view (`mallinfo2`) meets outside view
(`/proc`, traces) — and the observer caveat that §11.3 earned.

## `mallinfo2()` (the inside ledger — call it anywhere, ~free)

| Field | Meaning | §11 use |
|-------|---------|---------|
| `arena` | heap bytes from OS (excl. mmap'd) | fragmentation numerator |
| `uordblks` | heap bytes IN USE | live heap footprint |
| `fordblks` | heap bytes FREE (all bins + top) | `arena − uordblks` ≈ waste + overhead |
| `ordblks` | NUMBER of free chunks | 1 = pristine; 1001 = shredded (§11.3's run) |
| `hblkhd` | bytes in mmap'd chunks | brk-vs-mmap witness (brkvsmap's 4th column) |
| `hblks` | number of mmap'd chunks | mmap-path count |
| `keepcost` | releasable bytes at top | what `trim` COULD sbrk (top only!) |
| `usmblks` | always 0 (shared-mem legacy) | ignore |

Gap math: `arena − uordblks` = internal (headers/rounding) + external
(stranded) waste. `fordblks` vs RSS: equal means resident-waste; RSS <<
fordblks means trim already madvised the RAM home (VMA kept).

`malloc_stats()` dumps this ledger + per-bin counts to stderr. One call,
no parsing — start here when lost.

## Outside witnesses (no code changes)

- `[heap]` VMA size in `maps` — address-space footprint; frozen = pinned
  top (by whom? highest blocker — §11.3).
- RSS vs `fordblks` — decoupled after trim (the madvise gap).
- `MALLOC_TRACE=file` + `mtrace prog file` — EVERY call logged with
  caller addresses; tail shows unfreed = leak suspects. (This sandbox has
  no `mtrace` perl script — read the raw `@ ...` log; the shape teaches.)
- `mini_strace` (§03): `brk` = heap growth/shrink, `mmap`/`munmap` =
  large-chunk path, `sys_28` = `madvise` (3rd arg `0x4` = DONTNEED —
  the trim sweep, §11.3's proof).
- ASan (`-fsanitize=address`) / Valgrind — redzones, use-after-free,
  exact leaks. 2–20× slowdown; §35 times them. Not installed here;
  on your machine they are one flag/apt away.

## The observer caveat (READ THIS BEFORE MEASURING HEAPS)

Any measurement that mallocs (notably `fopen`'s 4 KiB stdio buffers)
carves the live top and — freed into tcache — PHYSICALLY PINS the VMA
it's measuring. Proven: identical alloc/free/trim with mid-run ledgers
→ heap VMA frozen at ~10 MiB; with ONE print at the end → 88 KiB.
Rules: measure from OUTSIDE (another process reading your `maps`/statm),
or measure once at the end, or use raw `open`/`read` on stack buffers.
(And re-read S01/S08/S09/S10: the observer effect is this track's
oldest enemy.)
