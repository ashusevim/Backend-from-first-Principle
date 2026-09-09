# 10 — Virtual Memory

**Question this section answers:** *How does every process get its own
private 128 TiB address space on a 4 GiB machine — and what actually happens
when it touches memory that isn't there?*

By the end you can: explain virtual-vs-physical translation cold; walk a
4-level page table on paper; classify any fault as minor/major/fatal; read
`/proc/PID/maps` like a floor plan; and prove demand paging and copy-on-write
with measurements, not slogans.

---

## 1. The illusion: addresses are not locations

Your program's pointers are **virtual addresses** — names, not RAM slots.
The **MMU** translates every access (virtual page → physical frame) using
the process's **page tables**. Each process has its own tables, so your
`0x7ffc…` and my `0x7ffc…` are different RAM — **isolation falls out of the
translation itself**.

Why pay for this indirection on EVERY memory access?

- **Isolation:** a process literally cannot name another's RAM (and the
  kernel's half is marked supervisor-only — user access faults).
- **The plenty illusion:** every process sees a full 128 TiB of user space
  (§3); the kernel backs only touched pages with real frames (§4).
- **Uniform linking:** every binary loads at the same virtual addresses, so
  code compiles once and runs anywhere in RAM (§12).
- **Shared bytes, private views:** libc's `.text` sits in RAM once, mapped
  into every process; `MAP_PRIVATE` file mappings start shared and diverge
  on write (§7).

The price: translation hardware (TLB, §3), fault handling (§4), and a whole
vocabulary of "how much memory" (VSZ/RSS/PSS, §6).

## 2. Pages and frames

RAM is managed in **frames** (physical slots); address space in **pages**
(virtual slots). x86-64 default: **4 KiB** (`getconf PAGESIZE`). A **mapping**
(page → frame + permission bits) lives in the page table; unmapped pages
have no entry at all.

Two sizes for every process, and they are NOT close:

| Metric | Meaning | Untouched 1 GiB `malloc` |
|--------|---------|--------------------------|
| **VSZ** (virtual) | bytes MAPPED (address range reserved) | ~1 GiB |
| **RSS** (resident) | bytes actually in RAM frames | ~0 |

That gap is **demand paging** (§4): the kernel creates the *area* eagerly
and backs pages *lazily*, on first touch. Experiment 02 measures both sides.

## 3. Page tables: the 4-level walk (x86-64)

48-bit "canonical" addresses: low 128 TiB = user, high 128 TiB = kernel, a
giant non-canonical **hole** between (using it faults). Translation walks
four tables, 9 bits per level + 12-bit page offset:

```text
virtual: [47..39] [38..30] [29..21] [20..12] [11..0]
          PML4     PDPT     PD       PT       offset
CR3 ──▶ PML4 ──▶ PDPT ──▶ PD ──▶ PT ──▶ FRAME + offset = physical
```

Each **PTE** (page-table entry) carries permission bits the MMU enforces:
**Present, RW, US** (user-accessible?), **NX** (no-execute), Accessed,
Dirty. Write to a read-only `.text` page? The MMU refuses → fault → kernel
sees no legitimate handler → **SIGSEGV**. Segfaults are *permission denials
by hardware* — read §4 before ever saying "dangling pointer" again. (Both
can be true; the fault is the mechanism.)

**TLB** (translation lookaside buffer): the on-chip cache of recent
translations — without it every access would cost 4 extra memory reads.
Context switches must flush or tag it (PCID); **huge pages** (2 MiB/1 GiB)
cover RAM with far fewer TLB entries, which is why databases obsess over
them (§35 measures the win).

▶ **Reference:** [notes/page-tables.md](notes/page-tables.md) — bit layout,
PTE flag table, TLB shootdowns, huge pages, ASLR interplay.
▶ **Diagram:** [diagrams/address-space.md](diagrams/address-space.md).

## 4. Faults: minor, major, fatal

A **page fault** = the MMU raised its hand ("not in the table / not allowed")
and the CPU entered the kernel's fault handler. Three outcomes:

| Class | Meaning | Cost | Example |
|-------|---------|------|---------|
| **minor** | page IS in RAM, table just lacks it | ~µs (wire it up) | first touch of fresh `mmap`/`malloc`; CoW setup |
| **major** | page must be READ from disk | ~ms | file-`mmap` first touch; swap-in |
| **fatal** | no legitimate mapping exists | process dies | unmapped touch → **SIGSEGV**; truncated-file `mmap` touch → **SIGBUS** |

Observe them (no root needed): `getrusage()`'s `ru_minflt`/`ru_majflt`,
`/proc/PID/stat` fields 10/12, or GNU `/usr/bin/time -v` — sadly absent in
minimal containers, which is why `faults.c` reads `getrusage()` directly.

**Demand paging**, precisely: `malloc`/`mmap` only create *virtual memory
areas* (VMAs — the lines in `maps`). First touch faults minor; the handler
grabs a zeroed frame, installs the PTE, returns; the faulting instruction
*re-executes* and succeeds. `mincore()` asks "which pages of this range are
resident?" — experiment 02 watches 0/65536 become 65536/65536.

**Overcommit:** `malloc` can *succeed* for memory that doesn't exist (the
kernel bets you won't touch it all). Touch too much → the **OOM killer**
picks a victim by `oom_score`. Check yours:
`/proc/self/oom_score_adj` (−1000 = unkillable, +1000 = first to die).

▶ **Code:** `code/faults.c` — mmap N MiB, prove 0-resident with `mincore`,
touch every page, print minor-fault delta + throughput.

## 5. The syscalls that shape your space

| Call | Job | You already met it as |
|------|-----|----------------------|
| `mmap`/`munmap` | map files or anonymous RAM; release ranges | every library load, big `malloc`s (>128 KiB), §11 |
| `mprotect` | change perms on a live range | W^X enforcement, JITs, guard pages |
| `brk`/`sbrk` | grow/shrink the classic heap top | small `malloc`s (§11) |
| `madvise` | hints: WILLNEED/DONTNEED/HUGEPAGE… | readahead control, returning RAM |
| `mincore` | residency query | experiment 02's proof |
| `mlock`/`mmap(LOCKED)` | pin frames (no swap) | crypto keys, realtime |
| `msync` | flush file mappings | §08's durability, mmap-flavored |

`MAP_PRIVATE` (copy-on-write, §7) vs `MAP_SHARED` (writes hit the file and
other mappers) is THE flag to internalize — exercise 3 makes it visceral.

## 6. Reading your own map: `/proc/PID/maps`

Each line is one VMA: `address-range perms offset dev inode pathname`.
A process floor plan, bottom to top: executable (`r-x` text, `r--` rodata,
`rw-` data — §12 explains why three), libc + loader mappings, `[heap]`
(classic brk heap), `mmap` region (big allocs, threads' stacks), `[stack]`
(main stack, grows down), `[vdso]`/`[vvar]` (kernel-donated fast syscalls —
`vdso_demo.c` in §03 called into THESE pages).

Deeper counters live next door: `smaps` (per-VMA Rss/Pss/Shared/Private…),
`smaps_rollup` (whole-process totals), `statm` (7 numbers, page units),
`status` (`VmRSS`, `VmSwap`, …). The only *summable-across-processes*
metric is **PSS** (proportional: shared pages ÷ sharer count) — summing RSS
double-counts every shared library.

▶ **Code:** `code/maps.c` — pretty-prints any process's map with region
classes + VSZ/RSS totals (a `pmap` you can read in one sitting).
▶ **Reference:** [notes/maps-field-guide.md](notes/maps-field-guide.md) —
every line format, every `[bracket]`, RSS vs PSS vs USS.
▶ Experiment 01 walks a live `sleep`'s map end to end.

## 7. Copy-on-write: `fork` without copying

`fork()` (§05) marks all private pages **read-only-but-shared** instead of
copying. First write to a shared page faults minor → kernel copies the ONE
page → writer goes on privately. A 1 GiB parent forks in microseconds; the
child pays only for pages it actually dirties.

▶ **Code:** `code/cow.c` — parent holds N MiB, forks, child writes all.
RSS stays flat throughout (it counts shared frames too — CoW is invisible
to RSS!). The witnesses are `Shr`/`Priv`/`Pss` from `smaps_rollup`: fork
moves 50M Priv→Shr and halves PSS; writing moves it back. Experiment 03
runs it + shows the OOM-score and swap (non-)picture.

Same trick elsewhere: `vfork`/`CLONE_VM` (share *everything*, §05), KSM
(kernel same-page merging deduplicates identical frames host-wide), Redis
`BGSAVE` (fork + CoW snapshot while serving writes).

## 8. Swap and reclaim (conceptual)

Two kinds of evictable pages: **file-backed** (drop + re-read from disk —
cheap) and **anonymous** (must be *written to swap* first — expensive).
`swappiness` (0–200) biases the choice. Without swap (most containers,
this sandbox: empty `/proc/swaps`), anonymous pages are UNEVICTABLE —
memory pressure can only drop file caches, then it's the OOM killer.

Watch (read-only, safe anywhere): `/proc/swaps`, `VmSwap` in `status`,
`si`/`so` in `vmstat 1` (swap-in/out — sustained nonzero = thrashing =
buy RAM). Container caps live in cgroup v2 (`memory.max`, `memory.events`
shows OOM kills) — §27 turns these knobs for real.

---

## Experiments

```bash
cd experiments/
./01-read-your-maps.sh     # maps/smaps/statm of a live process; VSZ vs RSS vs PSS
./02-demand-paging.sh      # 256MB untouched (RSS≈0) vs touched; mincore + fault counts
./03-cow-fork.sh           # fork 100MB without copying; watch RSS diverge on write
```

## Build the code

```bash
cd code/
make
./maps self | head -30
./faults 256               # mmap 256MB, touch progressively, print minflt + MB/s
./cow 100                  # parent holds 100MB, fork, child writes, Shr/Priv/Pss trace
```

## Exercises

1. `cat /proc/self/maps | head` vs `cat /proc/$$/maps | head` — different
   processes (the FIRST `self` is `cat` itself!). Find libc, `[stack]`,
   `[vdso]` in each. Now `./maps self | grep -E 'libc|stack|vdso'`.
2. `pmap -x $$` vs `./maps <that-pid>` — reconcile the columns (both read
   the same kernel files; `pmap -x` adds the smaps counters).
3. Shared-vs-private, visceral: `mmap` one file twice (`MAP_SHARED` +
   `MAP_PRIVATE`), write through the shared mapping, read through the
   private one — stale or fresh? Now write through private, re-read shared.
   Explain both in PTE terms. (Skeleton: extend `faults.c`'s mmap call —
   10 lines.)
4. Observe-only: `cat /sys/kernel/mm/transparent_hugepage/enabled`;
   `grep -i huge /proc/meminfo`. If `AnonHugePages > 0`, something already
   uses huge pages — `grep Huge /proc/*/smaps_rollup` to hunt it
   (permission errors on others' processes are expected).
5. Segfault anatomy: NULL deref → exit code? (`128+11=139`.) Then
   `mprotect` a page `PROT_NONE` and touch it — same signal, no NULL in
   sight. Both are PTE permission faults; the pointer was never the story.
6. (Think) If `fork` is CoW-cheap, why is forking a 10 GiB process still
   slowish? (The page TABLES copy: 10 GiB = 2.6M PTEs to duplicate — plus
   THP splitting. `vfork`/`posix_spawn` exist for fork+exec for exactly
   this reason.)

## Further reading (in this track)

- Next: [11 — Memory Management](../11-memory-management/) *(coming soon)*
  — `malloc` arenas, fragmentation, the allocator's view of `brk`/`mmap`.
- Back: [09 — Files and Filesystems](../09-files-and-filesystems/) (§5's zoo
  backs file mappings; `msync`/`fsync` share the durability story),
  [05 — Process Creation](../05-process-creation/) (fork's CoW half),
  [03 — System Calls](../03-system-calls/) (`vdso_demo` used §6's pages).
- Reference: [notes/page-tables.md](notes/page-tables.md),
  [notes/maps-field-guide.md](notes/maps-field-guide.md).
- Diagrams: [diagrams/address-space.md](diagrams/address-space.md).
