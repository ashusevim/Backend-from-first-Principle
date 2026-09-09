# Notes — Modes, rings, and the three gates

## The two modes (what the CPU tracks)

The current privilege level lives in the code-segment register (`cs`). `syscall`
swaps it to ring 0; `sysret` swaps it back. Everything else — which instructions
fault, which pages are visible — derives from that one value plus the page-table
`U/S` (user/supervisor) bits.

| | Ring 0 (kernel) | Ring 3 (user) |
|---|---|---|
| Privileged instructions (`cli`, `in/out`, `mov cr*`, `hlt`, `invplg`) | allowed | `#GP` fault → `SIGSEGV` |
| Supervisor pages (kernel half) | read/write | fault → `SIGSEGV` |
| Own user pages | read/write | read/write (per `RW` bit) |
| Hardware devices | via drivers | only via syscalls |

Linux famously ignores rings 1–2 (some hypervisors/V86-era tricks used them).
"Ring 0 vs ring 3" is the whole story on x86.

## The three gates (history of entering the kernel)

| Era | Instruction | Notes |
|---|---|---|
| 1990s–2000s | `int 0x80` | Classic interrupt gate: slow (~1µs), 32-bit ABI. Still works on x86-64 for compat (`eax`=number, `ebx…`=args). |
| Pentium II+ | `sysenter`/`sysexit` | Intel's fast gate; awkward to use (no saved return addr — libc/vDSO helper required). 32-bit fast path. |
| AMD64+ (today) | `syscall`/`sysret` | Fast (~100–300ns unmitigated), saves `rcx`/`r11`, kernel entry from `LSTAR`. The 64-bit ABI. |

You will essentially only ever emit `syscall` (via libc). The others matter
when reading old code, 32-bit binaries, and CVEs.

## Why not map/unmap the kernel per process instead (KPTI)?

That IS what KPTI (Kernel Page-Table Isolation, the Meltdown mitigation) does:
separate page tables for user/kernel halves, switched at each crossing via `cr3`
reload (+ TLB flush cost). Check yours:

```bash
cat /sys/devices/system/cpu/vulnerabilities/meltdown
```

`crossing_cost` in this section measures the world *with* your mitigations on —
compare with friends' machines / VMs to see the mitigation tax directly.

## One-sentence summary

**User mode is a sandbox built by the CPU; the kernel is the only code outside
it; `syscall` is the single audited door.**
