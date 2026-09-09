# 13 — Dynamic Linking

**Question this section answers:** *How does `printf` get into your process —
who runs first (`main` or the loader), and what does "lazy binding" cost?*

By the end you can: trace `ld.so`'s startup (map → relocate → init);
explain GOT/PLT lazy binding with a live `LD_DEBUG` trace; `dlopen` by hand;
and predict (then subvert, safely) symbol resolution with `LD_PRELOAD`.

---

## 1. `ld.so`: the program that runs before your program

For dynamic binaries the kernel's entry ISN'T `_start` — it's the loader
(`/lib64/ld-linux-x86-64.so.2`, from `PT_INTERP`). `ld.so` bootstraps
ITSELF (it's a static-ish PIE with its own entry), then:

1. **Map**: `mmap` every `NEEDED` lib (breadth-first from your `DT_NEEDED`
   tags — `readelf -d` lists them) + resolve their paths (`rpath` →
   `LD_LIBRARY_PATH` → `runpath` → `ld.so.cache` → `/lib`, `/usr/lib`).
2. **Relocate**: patch addresses — relative relocs (PIE slide, §12.4)
   eagerly; symbol relocs (your GOT entries) NOW or LAZILY (§2).
   `LD_DEBUG=statistics` counts them (87 for `/bin/true`, 4.6% of load).
3. **Init**: run loaders' + libs' `DT_INIT`/constructors (`.init_array`),
   IN DEPENDENCY ORDER — lib constructors run BEFORE your `main`
   (`whofirst.c` proves it).
4. **Jump**: to YOUR entry (`AT_ENTRY`): `_start` → `main`. The loader's
   job is done — except lazy PLT resolution (§2) and `dlopen` (§3).

See it: `/lib64/ld-linux-x86-64.so.2 ./a.out` (run the loader BY HAND —
same result!), `--list` (= `ldd`), `LD_DEBUG=libs` (search order,
object by object). Experiment 01 tours all three.

## 2. GOT/PLT: lazy binding, the call that rewrites itself

Your call to `printf` doesn't jump to libc — it jumps to a `printf@plt`
STUB in YOUR binary, which bounces through a GOT slot the loader owns:

```text
call printf@plt ──▶ PLT[printf]: jmp *GOT[printf] ──┬── 1st call: ──▶ resolver
                                                    │    (loader looks up
                                                    │    printf, REWRITES
                                                    └── 2nd call: ──▶ libc!
                                                         GOT[printf])  (direct)
```

First call pays symbol lookup (~µs); later calls pay one indirect jump
(~ns). Proof (experiment 02): `lazy.c` calls `a()` then `b()` (two of OUR
own `.so` files) with prints between — `LD_DEBUG=bindings` shows `a`'s
binding appear at the FIRST call, `b`'s at the second. `LD_BIND_NOW=1`
flips it: ALL bindings upfront (slower start, safer + crash-early —
what `-z now` bakes in, and what RELRO (§12) then write-protects).

▶ **Code:** `code/lazy.c` + `code/liba.c` + `code/libb.c` (two tiny shared
libs, built by our Makefile — no system deps).
▶ **Reference:** [notes/got-plt.md](notes/got-plt.md) — slot layout,
RELRO (partial vs full), `BIND_NOW`, the security angle.
▶ **Diagram:** [diagrams/lazy-binding.md](diagrams/lazy-binding.md).

## 3. `dlopen`: linking as a runtime API

`dlopen(path, RTLD_NOW|LAZY)` maps + relocates a lib MID-RUN (plugins!);
`dlsym(handle, "sym")` finds one symbol; `dlclose` unmaps (refcounted).
`ldd` on the caller shows NO such dep — the link exists only at runtime.

▶ **Code:** `code/dlmod.c` — `dlopen("./libb.so")`, `dlsym("b")`, call it.
`ldd dlmod` proves libb is absent at link time; the run proves it's
present at call time. (glibc ≥2.34 folded libdl INTO libc — `-ldl` still
accepted, now a no-op. libm/pthread went the same way: check `ldd`!)

## 4. Resolution order + `LD_PRELOAD`: who wins a symbol

When several libs define one symbol, the FIRST in breadth-first `NEEDED`
order wins (executable itself beats all — "symbol interposition").
`LD_PRELOAD=./libhook.so` injects YOUR lib FIRST — its symbols shadow
libc's for that run only. Legit uses: allocators (`tcmalloc`), sanitizers
(ASan!), debugging shims. Shady uses: rootkits (`LD_PRELOAD` is ignored
for setuid — `AT_SECURE`, §12.3 step 2!).

▶ Experiment 03: a 10-line `puts`-hook (prefix every line `[HOOKED]`) —
same binary, hooked vs clean, then `LD_DEBUG=symbols` shows the winner.

▶ **Reference:** [notes/loader-knobs.md](notes/loader-knobs.md) — every
`LD_*` var, `rpath` vs `runpath` vs `$ORIGIN`, sonames + `ldconfig`.

---

## Experiments

```bash
cd experiments/
./01-loader-tour.sh        # ldd/readelf -d/explicit-ld.so/LD_DEBUG=libs+statistics
./02-lazy-binding.sh       # bindings appear between prints; BIND_NOW flips it
./03-preload.sh            # puts-hook via LD_PRELOAD: hooked vs clean
```

## Build the code

```bash
cd code/
make
./lazy
./dlmod
./whofirst
```

## Exercises

1. `LD_DEBUG=libs /bin/true 2>&1 | grep -E 'find|trying'` — trace ONE
   lib's search (`libc`: tried paths in order, winner). Which entry came
   from `ld.so.cache`? (`ldconfig -p | grep libc` cross-check.)
2. `LD_DEBUG=statistics LD_BIND_NOW=1 /bin/true` vs without — compare
   "number of relocations" + startup cycles. (Lazy defers; NOW pays all.)
3. Break it safely: `LD_LIBRARY_PATH=/tmp/empty ./lazy` — still runs?
   (rpath `$ORIGIN` fires FIRST — path order made visible.) Then move
   `liba.so` away and run: read the loader's error (it names the
   missing SONAME, not a symbol — mapping precedes binding).
4. `dlopen` libm by SONAME: extend `dlmod.c` 3 lines (`"libm.so.6"`,
   `"cos"`) — works? (`ldd` says your binary needs no libm; glibc ≥2.35
   merged it into libc. `dlopen` still finds the compat stub. History
   you can link against.)
5. `readelf -d ./lazy | grep -E 'NEEDED|RUNPATH'` — your binary's loader
   instructions, 3 lines. Then `chrpath`-less edit?? No — observe:
   `RPATH` vs `RUNPATH` differ (§notes) — which did our `-rpath` emit?
   (`readelf -d` tells; modern ld emits RUNPATH.)
6. (Think) If `LD_PRELOAD` can shadow ANY symbol, why can't it steal
   setuid programs? (`AT_SECURE`: glibc ignores PRELOAD + LIBRARY_PATH
   for setuid/setgid — the kernel flags the risk at exec, §12.3.)

## Further reading (in this track)

- Next: [14 — Threads](../14-threads/) *(coming soon)* — `clone`, stacks,
  TLS: the loader builds thread-local storage too (`PT_TLS`!).
- Back: [12 — ELF and Program Loading](../12-elf-and-program-loading/)
  (`PT_INTERP`/`DYNAMIC`/entry — the loader's input),
  [10 — Virtual Memory](../10-virtual-memory/) (the maps it builds).
- Reference: [notes/got-plt.md](notes/got-plt.md),
  [notes/loader-knobs.md](notes/loader-knobs.md).
- Diagrams: [diagrams/lazy-binding.md](diagrams/lazy-binding.md).
