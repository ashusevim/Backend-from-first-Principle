# glibc malloc Internals: chunks, bins, thresholds, trim (as observed)

Reference for §11.1–11.4. Behavior verified on glibc 2.36 (Debian 12);
older/newer glibc differs in details (notably: trim's madvise sweep is
recent-ish — textbooks still say sbrk-only).

## Chunk layout (64-bit)

```text
| prev_size (8B, only valid if PREV chunk is free) |
| size (8B; low 3 bits are FLAGS, real size is 16-aligned) |
| user data ... (free chunks store fd/bk freelist links here) |
```

Flags: `PREV_INUSE` (bit 0: previous chunk live — else coalesce with it),
`IS_MMAPPED` (bit 1: this chunk is its own mmap — `free` munmaps it),
`NON_MAIN_ARENA` (bit 2: lives in a thread arena). Minimum chunk 24–32 B;
all sizes 16-aligned → `malloc(1)` rents 32 B. `malloc(0)` returns a
unique minimum chunk (not NULL!) — freeable, zero-usable.

## The bins, in malloc search order

| Bin | Discipline | Coalescing | Notes |
|-----|-----------|------------|-------|
| tcache (per-thread, per-size, ~64 entries) | LIFO | NEVER while cached | no lock; #1 cause of "freed but unreusable-for-other-sizes" |
| fastbins (sizes ≤ ~160 B) | LIFO | lazy (on next malloc) | no coalesce at free → fast free |
| unsorted bin (one) | FIFO-ish holding pen | on traversal | every free lands here first (past tcache/fast) |
| small bins (≤ ~1 KB, exact sizes) | FIFO | eager-ish | predictable reuse |
| large bins (> ~1 KB, size ranges) | sorted by size | yes | best-fit-ish within range |
| top (the wilderness) | — | IS the frontier | carve for the desperate; `sbrk` extends |

Top-merge is EAGER (freeing the top-adjacent chunk extends top NOW —
that's why auto-trim can fire mid-loop). All other merging waits for a
traversal (next malloc) — freed-into-tcache/unsorted chunks are
"free" to `mallinfo` but CONCRETE to `sbrk` (§11.3's VMA floor).

## MMAP_THRESHOLD: the dynamic ratchet (default 128 KiB)

- Request ≥ threshold → own anonymous VMA (`IS_MMAPPED`; `free` = `munmap`).
- Request < threshold → heap path (bins/top, `sbrk` growth).
- **Dynamic**: freeing a heap block that (after merging with top slack)
  exceeds the threshold RATCHETS the threshold up to it — never back down
  (except `mallopt`/env). Observed: after a 130 KiB alloc/free cycle, a
  131072 B request took the HEAP path (`hblkhd` stayed 0) — the freed
  130K + top slack crossed 128K and moved the boundary.
- Override: `MALLOC_MMAP_THRESHOLD_=bytes` (`0` = everything mmaps).

## Trim: TWO mechanisms (traced, not quoted)

`malloc_trim(0)` on glibc 2.36, measured via `mini_strace` on a 10 MiB
heap with 9 MiB free:

1. `brk`: literal top only — ONE shrink call (60 KiB here). Gated by the
   highest BLOCKER of any kind (live chunk, tcache'd buffer, unmerged
   bin chunk). Auto-trim (in `free`) fires when top exceeds
   `MALLOC_TRIM_THRESHOLD_` (default 128 KiB); explicit `trim(0)` keeps
   no pad.
2. `madvise(DONTNEED)`: every FULLY-FREE page of free runs, anywhere —
   998 ranges / ~5 MiB here, each 4–8 KiB. Pages holding ANY live byte
   are skipped (page-granular pinning). RAM returns; the VMA does NOT
   (`arena`/`fordblks` frozen — RSS and address space decouple!).

Repeat trims re-madvise the same pages (harmless noops, still return 1).

## Arenas (multicore)

Main arena = `[heap]`; non-main arenas = one committed rw-p sliver +
~64 MiB `---p` reservation each (measured). New threads SPREAD onto fresh
arenas (8 threads → 8 reservations, 511 MiB virtual); `MALLOC_ARENA_MAX=N`
caps the TOTAL (main + N−1). Cap: 8 × ncpu default. Threads stick to
their first arena (thread-local), so the sprawl persists for the run.

## Tunables (env or `mallopt`)

| Knob | Default | Effect |
|------|---------|--------|
| `MALLOC_MMAP_THRESHOLD_` | 128 KiB | heap/mmap boundary (bytes) |
| `MALLOC_TRIM_THRESHOLD_` | 128 KiB | auto-trim when top exceeds |
| `MALLOC_TOP_PAD_` | 128 KiB | sbrk overgrow / trim keep-back |
| `MALLOC_ARENA_MAX` | 8 × ncpu | total arena cap |
| `MALLOC_TCACHE_COUNT` | 64 | per-size tcache entries (`0` = off) |
| `MALLOC_TRACE` | unset | log every call for `mtrace` |
