# Address Space: the 128 TiB floor plan + the page-table walk

Visual companion for §10.1–10.3 and §10.6.

## Canonical 48-bit layout (one process's view)

```text
0xFFFFFFFFFFFFFFFF ┬  HIGH 128 TiB: kernel half (US=0 — user touch faults)
                   │   direct map of all RAM, vmalloc, modules, kernel text
0xFFFF800000000000 ┤
                   │  THE HOLE (non-canonical: any use faults immediately)
0x00007FFFFFFFFFFF ┤
                   │         ┌─ 0x7FFF…: [stack] (main, grows DOWN ⬇)
                   │         │  [vvar] [vdso] (kernel-donated, just below stack)
                   │         │  mmap region (libc, malloc>128K, threads, files —
                   │  USER   │   grows DOWN from mmap_base under ASLR)
  128 TiB          │  128 TiB│  ...
      user         │         │  [heap] (brk top, grows UP ⬆ from the exe)
                   │         │  exe: .text r-x, .rodata r--, .data rw-
                   │         │   (PIE: 0x55… randomized; classic: 0x40… fixed)
                   │         └─ 0x0: NULL page deliberately UNMAPPED
0x0000000000000000 ┴         (NULL deref faults by design, not by luck)
```

Real floor plan (§10.6 — actual `./maps self` output, addresses vary
per-run under ASLR):

```text
56105e184000-…  exe-ro/exe-text/exe-data   the binary itself (PIE @ 0x56…)
5610864c8000-…  [heap]                     brk heap, 132K
7fca13629000-…  libc/loader                libc text+data (r-x + r-- + rw-)
7fca…           anon-mmap                  malloc'd / thread / loader scratch
7ffd955c3000-…  [stack]                    main stack, 132K
7ffd955f4000-…  [vdso]                     gettimeofday without syscall
```

## The 4-level walk (x86-64)

```text
virtual address (48 bits used):
┌─────────┬─────────┬─────────┬─────────┬──────────────┐
│ 47..39  │ 38..30  │ 29..21  │ 20..12  │    11..0     │
│  PML4   │  PDPT   │   PD    │   PT    │    offset    │
└────┬────┴────┬────┴────┬────┴────┬────┴───────┬──────┘
     │         │         │         │            │
     ▼         ▼         ▼         ▼            ▼
   ┌────┐   ┌────┐   ┌────┐   ┌──────────┐  ┌────────┐
   │PML4│──▶│PDPT│──▶│ PD │──▶│PT: PTE   │  │ FRAME  │
   │512 │   │512 │   │512 │   │PFN+R W US│  │ 4 KiB  │
   └────┘   └────┘   └────┘   │NX A D …  │  └────────┘
CR3 ─┘ (phys base)            └──────────┘       │
        4 tables × 512 entries        PFN ◀──────┘
        = up to 4 RAM reads            │
        per TLB miss                   ▼
                              PHYSICAL ADDRESS
```

Shortcuts: PD entry with PS=1 → 2 MiB page (walk ends); PDPT entry with
PS=1 → 1 GiB page. Present=0 → fault (swap-in or die). RW=0 + write →
fault (CoW-copy or die). US=0 + user access → fault (die). NX=1 + fetch →
fault (die). Four permission checks on EVERY access, in hardware, at
full speed — that is what "the MMU enforces memory safety" means.
