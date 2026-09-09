# Page Tables (x86-64): the walk, the bits, the caches

Reference for §10.3. One page of truth about how a virtual address becomes
a physical one.

## The 4-level walk

`CR3` (per-process register, switched on context switch) holds the physical
address of the top table. A 48-bit virtual address splits into four 9-bit
table indices + 12-bit page offset:

```text
63..48 (sign ext)  47..39   38..30   29..21   20..12   11..0
   (canonical)      PML4      PDPT      PD       PT     offset
                     │         │        │        │
CR3 ──▶ PML4[512] ──▶ PDPT ──▶ PD ──▶ PT ──▶ FRAME (4 KiB) + offset
```

Each table has 512 8-byte entries = one 4 KiB page. Misses cost up to 4 RAM
reads — this is what the TLB exists to skip. (Newer CPUs offer 5-level
paging/LA57: 56-bit addresses, one more table. Same idea, one more step.)

## PTE bits that matter

| Bit(s) | Name | Meaning |
|--------|------|---------|
| 0 | Present | 0 = fault (unmapped OR swapped — OS decodes the rest) |
| 1 | RW | 0 = read-only (writes fault → CoW handler or SIGSEGV) |
| 2 | US | 1 = user-accessible; 0 = kernel only (user touch faults) |
| 5 | Accessed | CPU sets on read/write (reclaim algorithm's "recently used") |
| 6 | Dirty | CPU sets on write (tells the kernel the frame must be written back) |
| 7 | PS | 1 at PD/PDPT level = large page (2 MiB / 1 GiB), walk ends early |
| 8 | Global | skip on TLB flush (kernel mappings stay cached across switches) |
| 12–51 | PFN | the physical frame number (for 4 KiB pages) |
| 52–62 | Avail | OS playground (swap type/offset when Present=0, CoW markers…) |
| 63 | NX | No-eXecute: instruction fetch faults (W^X, exploit mitigation) |

**Read a segfault through this table:** write to `.text` (RW=0, VMA is
file-private, no CoW rule applies) → fault → kernel finds no handler →
SIGSEGV. The pointer wasn't "dangling"; the PERMISSION was absent.

## TLB: the cache that makes it affordable

The **TLB** caches VA→PA translations on-chip. Entries are tagged per
process (PCID/ASID) so context switches don't always flush. But unmapping
or `mprotect`ing a page must invalidate it on EVERY core running the
process — a **TLB shootdown** (inter-processor interrupt). Frequent
`mmap`/`munmap` churn therefore has a hidden multicore tax (§35).

## Huge pages: fewer entries, bigger coverage

| Size | Level | Use |
|------|-------|-----|
| 4 KiB | PT | default everything |
| 2 MiB | PD + PS | THP (transparent), DPDK, JVMs |
| 1 GiB | PDPT + PS | giant DB buffer pools, explicit `hugetlbfs` |

One TLB entry covering 2 MiB instead of 4 KiB = 512× the reach per entry.
Databases measure real throughput wins; the cost is internal fragmentation
and allocation latency (finding contiguous 2 MiB gets hard under pressure).
Knob: `/sys/kernel/mm/transparent_hugepage/enabled`
(`always`/`madvise`/`never`); census: `grep -i huge /proc/meminfo`.

## Canonical addresses + ASLR

Bits 63:48 must equal bit 47 (sign extension). Valid ranges: user
`0x0000000000000000–0x00007FFFFFFFFFFF` (low 128 TiB), kernel
`0xFFFF800000000000–0xFFFFFFFFFFFFFFFF` (high 128 TiB). Anything between
faults (`#GP`, delivered as SIGSEGV). **ASLR** randomizes *where inside*
user space things land (PIE exe base, `mmap` base, stack, vdso):
`/proc/sys/kernel/randomize_va_space` (0 off, 1 on, 2 on + brk). §12 shows
the load addresses dancing run to run.
