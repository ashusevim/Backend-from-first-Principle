# 11 — Memory Management

**Question this section answers:** *Where does `malloc`'d memory come from,
why does RSS never shrink, and what is fragmentation — in numbers, not
metaphors?*

By the end you can: predict whether an allocation takes the `brk` or `mmap`
path; explain chunks/bins/tcache well enough to read `malloc_stats`;
construct fragmentation on demand and measure it with `mallinfo2`; and tame
arena sprawl in threaded programs.

---

## 1. Two doors into the address space: `brk` vs `mmap`

`malloc` has a split personality, chosen by size:

| Path | When | Backing | `free()` does |
|------|------|---------|---------------|
| **brk heap** | request < `MMAP_THRESHOLD` (default 128 KiB) | one growing segment (`[heap]`, §10.6) | bins the chunk (kept for reuse) |
| **mmap** | request ≥ threshold | its OWN anonymous VMA | `munmap`s it (RSS drops immediately) |

The threshold is **dynamic**: it ratchets UP (never down, unless you
`mallopt`) whenever you free a heap chunk bigger than it — glibc assumes a
big-chunk workload and stops routing giants through the bins. Override it
from the shell: `MALLOC_MMAP_THRESHOLD_=1048576` (bytes).

Consequences you can verify TODAY (experiment 01):

- `malloc(1M)` + `free` → VSZ/RSS return to baseline (munmap'd).
- `malloc(1K)` × 10000 + `free` all → RSS likely STAYS (trim only from the
  top — §3).
- `MALLOC_MMAP_THRESHOLD_=0` routes EVERYTHING through mmap: maximal RSS
  honesty, maximal syscall overhead. Don't ship it; do feel it once.

▶ **Code:** `code/brkvsmap.c` — allocates 1 KiB→8 MiB step by step and
reports, per size, "`[heap]` grew" or "new anon VMA appeared". The boundary
it finds (~128 KiB) is the live threshold, not a man-page rumor.

## 2. Inside the heap: chunks, bins, tcache

Heap memory is carved into **chunks**. Every chunk starts with a header
(`prev_size`, `size` — whose low 3 bits are flags: PREV_INUSE, IS_MMAPPED,
NON_MAIN_ARENA), then user data; free chunks store freelist pointers
(`fd`/`bk`) inside the data area. Minimum chunk ~24–32 bytes, 16-byte
alignment on 64-bit: even `malloc(1)` rents 32 bytes (internal fragmentation
floor, §3).

Freed chunks wait in **bins**, searched in malloc order:

1. **tcache** (per-thread cache): LIFO, ~64 entries per size class, NO
   coalescing while cached, NO lock. Blazing fast — and the #1 reason freed
   memory "isn't available" for differently-sized requests.
2. **fastbins**: LIFO, no coalescing (coalesced lazily on next malloc).
3. **small/large bins**: sorted, coalesced on free (neighbors merge).
4. **unsorted bin**: one holding pen, sorted on next search.
5. **top** (the wilderness): the free run at the heap's END. The only part
   `sbrk` can return — but trim ALSO madvises free pages anywhere in the
   heap (page-granular, traced in exp 02). One live block at the top still
   pins all address space below it (§3's whole story).

`sbrk` grows the heap when top runs dry; `realloc` extends in place when the
top/neighbor allows, else moves; `calloc` is malloc+zero (and glibc skips
re-zeroing fresh-from-OS pages it knows are already zero).

▶ **Reference:** [notes/glibc-malloc-internals.md](notes/glibc-malloc-internals.md)
— chunk layout, every bin, the search path, tunables.
▶ **Diagram:** [diagrams/heap-anatomy.md](diagrams/heap-anatomy.md).

## 3. Fragmentation: the two taxes + what trim REALLY does

**Internal** (rounding): headers + alignment + minimums. Rented-but-unusable,
bounded (~15% worst case for tiny objects), unfixable without a new design.

**External** (stranding): free memory exists but not where the next request
needs it — wrong bin, wrong arena, or below a pinned top. Unbounded, and
the misunderestimated one. `mallinfo2()` makes both visible: `arena` (heap
bytes from OS) vs `uordblks` (actually used) — the gap is fragmentation +
overhead, live.

Textbooks say `malloc_trim` only lowers `brk` from the top — and one live
block at the top pins everything below it:

```text
heap bottom ──▶ [used][free][free][used][free]...[free][LIVE] ◀── top
                                                       ▲
                                              sbrk can only retreat
                                              from the literal top
```

True — but INCOMPLETE on modern glibc (2.36, traced with `mini_strace` in
experiment 02). `malloc_trim` does TWO things:

1. **sbrk**: releases the literal top (here: ONE call, 60 KiB — everything
   above the pin). Address space back, immediately reusable by anyone.
2. **madvise(DONTNEED)**: discards ~every FULLY-FREE page of free runs
   ANYWHERE in the heap (here: 998 ranges, ~5 MiB). RAM back — but the
   address space stays mapped (`arena`/`fordblks` don't move!).

And the pin rule has a page-granular twin: a page containing ANY live byte
is skipped by the madvise sweep. Our 1 MiB of keepers (every 10th block)
pinned ~4.3 MiB of RAM — one live byte pins its whole 4 KiB page.

The deepest cut (verified, then verified again): **the observer pins the
VMA**. `frag.c`'s final heap VMA froze at ~10 MiB even after freeing
everything — because its own `fopen` measurement buffers were carved from
the 10 MiB top and parked in tcache, physically blocking `brk` retreat.
Re-ran with ZERO mid-run measurements: heap VMA → 88 KiB. Freed-into-
tcache chunks are "free" to `mallinfo` but CONCRETE to `sbrk` — the VMA
floor is the highest blocker of ANY kind. (S01/S08/S09/S10's observer
effect, wearing its final costume.)

▶ **Code:** `code/frag.c` — the whole story in one binary: 10 MiB heap,
free 90% (RSS frozen), trim (RAM half-back, VMA frozen), unpin + trim
(RAM to base, VMA STILL frozen — now you know why).
▶ Experiment 02 replays it + traces the trim syscalls + proves the 88 KiB
with a no-observer build.

## 4. Arenas: `malloc` goes multicore

One heap + one lock = threads queueing to allocate. glibc's answer:
**arenas** — the main arena (`[heap]`) plus up to **8 × ncpu** non-main
arenas (each up to 64 MiB of virtual anon space on 64-bit, fresh mappings
in `maps`). A thread's first malloc picks a free arena (round-robin, then
shares when exhausted); tcache absorbs the uncontended fast path without
touching any lock.

The cost is footprint: every arena keeps its own top pad and bins, so 100
threads can hold 100 arenas' worth of slack. `MALLOC_ARENA_MAX=4` caps it
(throughput-vs-footprint dial — measure, §35). Symptoms of arena bloat:
VSZ in the gigabytes with modest RSS, dozens of 64 MiB anon VMAs.

▶ **Code:** `code/arenas.c` — T threads each hold 64 KiB (heap path!),
then counts the ~64 MiB `---p` reservations in its own maps: 8 threads →
8 reservations, 511 MiB of virtual. Experiment 03 sweeps T and `ARENA_MAX`.

## 5. Measuring: `mallinfo2`, `malloc_stats`, traces

| Tool | Gives | Cost |
|------|-------|------|
| `mallinfo2()` | `arena/uordblks/fordblks/hblkhd/…` — the allocator's own ledger | ~free (call it anywhere) |
| `malloc_stats()` | same ledger + bin counts, dumped to stderr | ~free |
| `MALLOC_TRACE=file` + `mtrace` | EVERY call logged (addr/size/caller) | slow, huge logs — record small runs |
| `mtrace` (perl script) + raw log | leak suspects (unfreed addrs at exit) | needs the trace |
| ASan/Valgrind | redzones, use-after-free, exact leaks | 2–20× slowdown (worth it; §35) |

Rule: `mallinfo2` for "how fragmented AM I"; `MALLOC_TRACE` for "WHO
allocated this"; ASan when something actually bleeds.

▶ **Reference:** [notes/measuring-memory.md](notes/measuring-memory.md) —
every `mallinfo2` field, reading `malloc_stats`, a worked `mtrace` session.

## 6. Allocator zoo (conceptual)

- **dlmalloc**: Doug Lea's design, the ancestor — still in newlib/embedded.
- **ptmalloc2**: glibc's (this whole section). Good default, mediocre at
  fragmentation under weird patterns.
- **jemalloc** (FreeBSD, Facebook): size classes + profiling built in
  (`MALLOC_CONF=prof:true` → heap profiles that feed §35).
- **tcmalloc** (Google): aggressive per-thread caching, low lock contention.
- **mimalloc** (Microsoft): free-list sharding, security-first, often fastest.
- **scudo** (Android): hardened (quarantine, checksums) — security over speed.
- **SLUB/SLAB** (kernel-side): the kernel runs its OWN allocator family for
  inodes/dentries (§09's nouns live here) — §33 opens that door.

Swap with `LD_PRELOAD` (`libjemalloc.so`), but only after profiling says
the allocator is your problem. It usually isn't — your retention is.

---

## Experiments

```bash
cd experiments/
./01-brk-vs-mmap.sh       # find MMAP_THRESHOLD empirically; move it; trace brk/mmap syscalls
./02-fragmentation.sh     # strand the top; mallinfo2 + RSS before/after trim
./03-arenas.sh            # threads × arenas; ARENA_MAX tames the VMA sprawl
```

## Build the code

```bash
cd code/
make
./brkvsmap              # 1K..8M: [heap] grew or new anon VMA? (boundary ≈128K)
./frag 10000            # 10k x 1K blocks: free 90%, watch fordblks vs RSS
./arenas 8              # 8 threads x 64K: 8 x 64M reservations (511M VSZ!)
```

## Exercises

1. `MALLOC_MMAP_THRESHOLD_=1048576 ./brkvsmap` — boundary moves to 1 MiB?
   Then `MALLOC_MMAP_THRESHOLD_=0` (everything mmaps). Explain both, plus
   why 0 costs syscalls on every large alloc AND every large free.
2. Pin + no-observer probe (guided, ~20 lines of C): fill 10 MiB heap with
   1 KiB blocks; free 90% keeping every 10th; `malloc_trim(0)`; print RSS
   + heap VMA (RAM half-back, VMA frozen — madvise skipped keeper pages).
   Free the rest; trim; print (RAM to base, VMA STILL frozen — your own
   `fopen` buffers pin the top!). Then delete ALL mid-run measurements,
   print once at the end: heap VMA → ~88 KiB. You have reproduced §3.
3. `MALLOC_TRACE=/tmp/t ./frag 1000 && mtrace ./frag /tmp/t | head -20`
   (needs the `mtrace` perl script — if absent, read `/tmp/t` raw: `@`
   lines are calls, and the shape still teaches).
4. `./arenas 2` vs `./arenas 16` — count the arenas. Then
   `MALLOC_ARENA_MAX=2 ./arenas 16`: same program, fewer arenas. Say out
   loud what you traded (lock contention for footprint) and when it wins.
5. (Think) tcache holds ≤64 freed chunks per size WITHOUT coalescing.
   Allocate 1M×64B, free all, allocate 1M×128B: peak RSS ≈ ? (The 128B
   requests can't reuse 64B chunks → both generations resident at once,
   ~192 MiB transient. Bins would coalesce; caches don't.)
6. Leak eye-test (5-minute program): loop 1000× { malloc+touch 100K, print
   RSS every 100 } without `free` — linear climb. Add `free` — flat. That
   linear-vs-flat shape is every leak graph you will ever read.

## Further reading (in this track)

- Next: [12 — ELF and Program Loading](../12-elf-and-program-loading/)
  *(coming soon)* — how binaries describe their own future maps.
- Back: [10 — Virtual Memory](../10-virtual-memory/) (VMAs, faults, RSS),
  [05 — Process Creation](../05-process-creation/) (fork+CoW),
  [03 — System Calls](../03-system-calls/) (`mini_strace` returns in exp 01).
- Reference: [notes/glibc-malloc-internals.md](notes/glibc-malloc-internals.md),
  [notes/measuring-memory.md](notes/measuring-memory.md).
- Diagrams: [diagrams/heap-anatomy.md](diagrams/heap-anatomy.md).
