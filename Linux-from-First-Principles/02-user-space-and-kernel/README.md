# 02 — User Space and Kernel

**Question this section answers:** *Why can't my program just read the disk /
kill any process / touch hardware — and what exactly happens when it asks the
kernel to do it instead?*

By the end you'll be able to explain privilege rings, the user↔kernel
transition (down to the CPU instruction), why the boundary exists, and *feel*
its cost in nanoseconds.

---

## 1. Why the boundary exists at all

Imagine there were no kernel — every program touched hardware directly, like
MS-DOS did. Three things break immediately:

1. **No protection.** Your browser bug overwrites the disk driver. One crash
   takes down everything; one malicious program owns the machine.
2. **No sharing.** Two programs want the disk head, the NIC, the last free
   page of RAM. Someone must arbitrate — that someone is the kernel.
3. **No abstraction.** Every program would need drivers for every disk/NIC.
   The kernel's drivers + uniform interfaces (files, sockets) mean programs
   are written once.

So the design: **exactly one program is fully trusted (the kernel); everything
else is untrusted and must ask.** The CPU *enforces* this in hardware — it's
not a gentleman's agreement.

## 2. How the CPU enforces it: rings and modes

x86 has 4 privilege levels ("rings"), 0 (most privileged) to 3 (least).
Linux uses two:

- **Ring 0 — kernel mode (supervisor).** Can execute *privileged instructions*
  (`cli`/`sti` interrupts, `in`/`out` port I/O, `mov cr3` page tables, `hlt`…)
  and access all memory. Only kernel code runs here.
- **Ring 3 — user mode.** Cannot execute privileged instructions (CPU raises
  `#GP` fault → kernel delivers `SIGSEGV` to you) and can only touch memory
  the kernel mapped for you.

```text
Ring 0 (kernel mode)              Ring 3 (user mode)
┌──────────────────┐              ┌──────────────────┐
│ kernel code      │              │ YOUR program     │
│ • all instructions│             │ • normal insns   │
│ • all memory     │              │ • own memory only│
│ • devices, MMU   │              │ • privileged op? │
└──────────────────┘              │   → #GP → SIGSEGV│
                                  └──────────────────┘
              ▲                                  │
              │   the ONLY legal way across:     │
              │   the `syscall` instruction      │
              └──────────────────────────────────┘
```

Other architectures differ in detail (ARM: EL0/EL1 + `svc` instruction) but
the shape is identical: **unprivileged by default, one gated door.**

▶ **Code:** `code/privilege_denied.c` — try a privileged operation (`iopl`)
as a normal user and watch the kernel refuse with `EPERM`. The refusal *is*
the boundary working.

## 3. The crossing: what `syscall` actually does

When your program needs the kernel (read a file, spawn a process…), the C
library ends up executing one CPU instruction: **`syscall`** (x86-64). The
hardware then, atomically:

1. Saves where you were (`rcx` ← return address, `r11` ← flags).
2. Loads kernel code segment + stack (from hidden registers the kernel set at
   boot — `MSR_STAR`, `MSR_LSTAR`, `MSR_SFMASK`).
3. Jumps to the kernel's single entry point (`entry_SYSCALL_64`).

The kernel then reads the **syscall number** from `rax` (e.g. `0`=read,
`1`=write, `39`=getpid), dispatches through the **syscall table** to the
handler (e.g. `sys_getpid`), runs it, puts the return value in `rax`, and
executes **`sysret`** — which drops privilege back to ring 3 and resumes you.

```text
USER (ring 3)                          KERNEL (ring 0)
─────────────                          ──────────────
getpid()
  │ libc wrapper: rax ← 39
  │               syscall ◄── CPU gate: save rip, load kernel cs/stack,
  │                  │        jump to entry_SYSCALL_64
  │                  ▼
  │            syscall table[39] → sys_getpid()
  │                  │             reads current->pid from YOUR task_struct
  │                  │             (kernel can read it; you can't)
  │                  ▼
  │               sysret ◄── drop to ring 3, restore rip
  ▼
rax = 4242, continue in user mode
```

Key consequences:

- **Arguments pass in registers** (`rdi, rsi, rdx, r10, r8, r9`) — no stack,
  no heap: the kernel can't trust your stack. (Full ABI: Section 03.)
- **The kernel must distrust everything you hand it**: every pointer is
  validated (`copy_from_user`), every fd is looked up in *your* table. Bugs
  here are CVEs — this is why syscall handlers are so carefully written.
- **Crossing has a cost**: pipeline flush, Spectre/Meltdown mitigations
  (KPTI page-table switch!), cache effects. Roughly **100ns–1µs** per call —
  thousands of times slower than a function call. Measure it below; don't take
  our word for it.

▶ **Code:** `code/crossing_cost.c` — times a million `getpid()` calls vs a
million empty loop iterations. Typical result: the loop is ~1ns/iter, the
syscall ~200–800ns. That gap is the price of the gate.

## 4. The boundary in everyday life

Once you see it, you see it everywhere:

| Symptom | Boundary at work |
|---------|------------------|
| `Operation not permitted` | syscall's capability check failed (`EPERM`) |
| `Permission denied` on `/proc/1/mem` | kernel refuses cross-process memory access |
| `dmesg: read kernel buffer failed` | unprivileged users blocked from kernel log (info leak guard) |
| Segfault on wild pointer | MMU + kernel refuse; your process dies, system survives |
| Kernel panic (rare) | a bug *in ring 0* — nothing left to contain it, machine halts |
| Container "escape" CVE | a bug that lets ring-3 cross the boundary illegally |

▶ **Experiment:** `experiments/01-feel-the-boundary.sh` — poke the wall from
three directions (privileged instruction attempt, another process's memory,
the kernel log) and read the refusals.

## 5. "Kernel space" as memory, not just mode

One subtlety that pays off in Section 10: on x86-64 Linux, **every process's
virtual address space contains the kernel** in its upper half:

```text
0xFFFFFFFFFFFFFFFF ┐
                   │  kernel half (same for all processes;
                   │  accessible ONLY in ring 0)
0xFFFF800000000000 ┤
───────────────────┼── ← the wall (enforced by page-table privilege bits)
0x00007FFFFFFFFFFF ┤
                   │  user half (yours: code, heap, stack,
0x0000000000000000 ┘  libraries — different per process)
```

Why map the kernel into every process? So that `syscall` doesn't need to swap
page tables on entry — speed. (After Meltdown, KPTI mostly unmaps it again for
safety; you pay the switch cost instead. Security vs performance, negotiated
in nanoseconds — Section 35 returns to this.)

---

## Experiments

```bash
cd experiments/
./01-feel-the-boundary.sh     # poke the wall: iopl, /proc/1/mem, dmesg
```

## Build the code

```bash
cd code/
make
./privilege_denied
./crossing_cost
```

## Exercises

1. Run `./crossing_cost` several times. How stable are the numbers? What on a
   busy machine could inflate them? (Think: what else uses the CPU — Section 06.)
2. `grep -E 'syscall|sysenter' /proc/cpuinfo | head -1` won't show flags that
   way — instead run `grep -o 'syscall\|sysenter' /proc/cpuinfo | sort -u`.
   What's the difference between `syscall` and the older `sysenter`/`int 0x80`?
   (Notes file has the history.)
3. As a thought experiment: `read()` takes a pointer to *your* buffer. Why
   can't the kernel just dereference it? List two things that could go wrong.
   (Answer: unmapped address → fault in kernel; race with another thread
   unmapping it — `copy_from_user` handles both. Section 03 + 32.)
4. Why does `strace` slow programs down 10–100×? (Preview: every syscall stops
   the tracee twice — Section 03 builds a tracer and you'll feel it.)

## Further reading (in this track)

- Next: [03 — System Calls](../03-system-calls/) — the gate mechanism in full:
  numbers, ABI, libc vs raw, errno, vDSO, tracing.
- Reference: [notes/modes-and-rings.md](notes/modes-and-rings.md).
- Diagrams: [diagrams/mode-transition.md](diagrams/mode-transition.md).
