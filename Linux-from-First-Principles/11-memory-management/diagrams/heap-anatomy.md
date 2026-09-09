# Heap Anatomy: chunks, bins, doors, trim

Visual companion for §11.1–11.4. All numbers from real runs (glibc 2.36).

## The two doors (brkvsmap's verdict)

```text
malloc(n):
  n + overhead >= MMAP_THRESHOLD (128K, dynamic!) ──▶ mmap door
  │     own anon VMA ... free() = munmap (RSS drops NOW)
  │     hblkhd += n (the witness)
  ▼
  heap door ──▶ tcache? fastbin? small/large? unsorted? top (sbrk grows [heap])
        free() = park in a bin (RSS stays until trim)
```

Measured boundary dance: 130048 → brk (heap 135K→270K, then auto-trim
back); 131072 → HEAP anyway (threshold had ratcheted past it!);
262144+ → mmap (anon +266240, hblkhd +266240). Env moves the door:
`MALLOC_MMAP_THRESHOLD_=1M` puts 262144 on the heap (heap→401K).

## Chunk + bins (one arena)

```text
heap bottom ──▶ [hdr|data][hdr|fd|bk|data...][hdr|data] ... [TOP ~~~~~~~~~~] ◀── brk
               live 16B-aligned   free: links live    wilderness: carve here,
               min 24-32B         in data area        sbrk extends right

freed chunks wait in:  tcache (per-thread LIFO, NO coalesce — 64/size)
                       fastbins (LIFO, lazy coalesce)
                       unsorted (holding pen — merged on next malloc...)
                       small/large (sorted, coalesced)   ...or top (eager!)
```

## Trim: what REALLY happens (traced: 1 brk + 998 madvises)

```text
BEFORE (10M heap, 90% freed, pin near top):
[KEPT][9K free]...[KEPT][9K free][PIN 1K][top 52K]   RSS 11M, ford 9M
AFTER malloc_trim(0):
[KEPT][9K free]...[KEPT][9K free][PIN 1K]             RSS 6.5M, ford 9M (!!)
  │         │                              └── sbrk: top 52K GONE (VMA -52K)
  │         └── madvise(DONTNEED): fully-free PAGES discarded (~5M RAM home)
  └── keeper PAGES skipped: 1 live byte pins its whole 4K page (4.3M stays!)

fordblks UNCHANGED (9M): RAM returned, address space kept. RSS-vs-VMA decouple.
```

## Arenas: the 64M-reservation sprawl (8 threads)

```text
[heap] (main arena)   +   per thread arena:
                          [132K rw-p committed][65404K ---p RESERVED] x8
                          ─────────────────────────────────────────────
                          VSZ += 511M for 512K of actual holds.
MALLOC_ARENA_MAX=2  ──▶   1 reservation (64M). Same program. Dial works.
```

## The observer pins the VMA (frag.c's final lesson)

```text
mid-run ledgers (fopen bufs carved @10M top, tcache-parked):
[....................10M of free runs....................][4K buf][top~0]
                                                          ▲
                                              tcache'd = "free" to mallinfo,
                                              CONCRETE to sbrk. VMA: 10244K.
no-observer rerun (ONE print at end):  heap VMA = 88K. Same frees. Same trim.
```

Moral, carved in stone: the VMA floor is the HIGHEST BLOCKER OF ANY KIND —
live, binned, tcache'd, or your own measuring tape.
