# maps Field Guide: every line, every counter, every [bracket]

Reference for §10.6. Four files, one story: WHAT is mapped, WHOSE bytes
they are, and HOW MUCH RAM they cost.

## 1. `maps`: one line per VMA

```text
address-range          perms offset   dev   inode   pathname
7fca1364f000-7fca137a5000 r-xp 00000000 fe:00  4567   /usr/lib/.../libc.so.6
```

- **perms**: `rwx` + `p`rivate (CoW) or `s`hared (writes visible/file).
- **offset**: where in the FILE this slice starts (0 for anon).
- **dev:inode**: which file (00:00 = anonymous). Same dev+inode across
  processes = literally the same cached pages (shared libc!).
- **pathname**: the file — or a **[bracket]** (§2), or empty (anonymous).

## 2. The [brackets]

| Entry | Meaning |
|-------|---------|
| `[heap]` | classic brk heap (§11: small `malloc`s) |
| `[stack]` | main thread's stack (grows down from high user) |
| `[stack:TID]` | another thread's stack (one per thread, §14) |
| `[vdso]` | kernel-donated fast syscalls (`gettimeofday` with no trap — §03's `vdso_demo` called HERE) |
| `[vvar]` | vdso's data page (time vars the kernel keeps fresh) |
| `[vsyscall]` | legacy trap trampoline (emulated, near-retired) |
| `[anon:name]` | named anonymous range (some allocators/drivers label theirs) |
| `[memfd:name]` | memfd-sealed RAM file (§18's favorite) |
| `path (deleted)` | NOT a bracket but a suffix: open-but-unlinked file (§09.1's rule, alive in RAM) |

Empty pathname + `rw-p` = plain anonymous mapping (big `malloc`s, thread
scratch, loader bookkeeping): `maps.c` calls it `anon-mmap`.

## 3. `smaps`: per-VMA counters (the expensive truth)

Each VMA gets ~20 lines. The ones worth memorizing:

| Counter | Meaning |
|---------|---------|
| `Rss` | resident in THIS vma (shared counted FULLY — do not sum across processes) |
| `Pss` | proportional: shared pages ÷ sharer count (THE summable metric) |
| `Shared_Clean/Dirty` | resident + shared by ≥2 (Dirty = modified, needs writeback) |
| `Private_Clean/Dirty` | resident + exclusively mine (Dirty anon = my heap/stack/data) |
| `Anonymous` | resident anon (not file-backed) — my true RAM footprint lives here |
| `Swap` | currently swapped OUT from this VMA |
| `THPeligible` / `AnonHugePages` | THP state (notes/page-tables.md) |
| `VmFlags` | VMA flags (`rd wr ex sh mr mw me ms lo …` = read/mayread/maywrite/mayexec/mays Share/locked/…) |

`smaps_rollup` sums all of the above process-wide (what `cow.c` reads).
Reading `smaps` walks every page table — slowish on giants; `statm` is the
cheap version.

## 4. `statm`: 7 numbers, page units, cheap

`size resident shared text lib data dt` — divide by `getconf PAGESIZE`
carefully (values are PAGES, not KiB). `size` = VSZ, `resident` = RSS.
`shared` ≈ file-backed resident; `text` ≈ executable resident; `lib` and
`dt` are historical (always 0).

## 5. `status`: the greatest-hits album

`VmPeak` (VSZ high-water), `VmSize` (VSZ now), `VmHWM` (RSS high-water),
`VmRSS`, `RssAnon`/`RssFile`/`RssShmem` (RSS split by backing!),
`VmData`/`VmStk`/`VmExe`/`VmLib` (by use), **`VmPTE`** (RAM eaten by the
page TABLES themselves — fork-a-giant's hidden cost, exercise 6),
`VmSwap` (swapped now), `HugetlbPages`.

## 6. RSS vs PSS vs USS — pick the right ruler

| Metric | Shared pages count as | Sums across processes? | Answers |
|--------|----------------------|------------------------|---------|
| **RSS** | FULL each (double-counts libc everywhere) | NO | "how much RAM would free IF this process died AND nothing shared?" (nobody asks this) |
| **PSS** | 1/n per sharer | YES | "how much RAM does the SYSTEM owe this process?" |
| **USS** | 0 (private only) | YES | "how much is UNIQUELY mine?" (= Priv total) |

Rule of thumb: size ONE process → USS; size a WORKLOAD → sum PSS; RSS is
for headlines and `ps` defaults. `smem -t` does the PSS math for you.
