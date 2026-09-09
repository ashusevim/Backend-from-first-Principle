# GOT/PLT: the call that rewrites itself + RELRO

Reference for §13.2. The three slots and the two shields.

## The machinery (x86-64)

- **PLT** (`.plt`, in YOUR text): one tiny stub per imported function:
  `jmp *GOT[n]; push $reloc_index; jmp resolver`. Fixed code, never changes.
- **GOT** (`.got.plt`, in YOUR data): one 8-byte slot per import. Starts
  pointing BACK at the PLT's resolver push; after first call, points at
  the REAL function (in libc). The slot is the ONLY thing that changes.
- **Resolver** (`ld.so`'s `_dl_runtime_resolve`): looks the symbol up
  (breadth-first NEEDED order — §13.4), writes the GOT slot, jumps there.

Cost model: first call = full symbol lookup (~µs: hash walk + strcmp);
later calls = one indirect `jmp` (~1–2 ns). `LD_BIND_NOW=1` / `-z now`
pays ALL lookups at startup (slower exec, deterministic latency after —
realtime's choice) and enables FULL RELRO.

## RELRO: freezing the loader's homework

| Mode | GOT after relocate | Baked by |
|------|-------------------|----------|
| none | writable forever | ancient / `-z norelro` |
| partial (`GNU_RELRO` + lazy) | `.got` frozen, `.got.plt` WRITABLE (lazy needs it!) | distro default |
| full (`-z now` + RELRO) | EVERYTHING frozen after eager bind | `-z now`, hardened builds |

Check yours: `readelf -lW ./lazy | grep -E 'RELRO|GNU_RELRO'` + `readelf
-d` for `BIND_NOW`/`FLAGS`. GOT-overwrite was THE 2000s exploit primitive
(write-what-where → point `free@got` at shellcode); full RELRO kills it.

## Seeing it live

- `LD_DEBUG=bindings ./lazy` — one line per resolution, AT resolve time
  (the §13.2 experiment: lines land BETWEEN the prints).
- `objdump -d -j .plt ./lazy | head` — the stubs (3 instructions each).
- `gdb -batch -ex 'b a' -ex r -ex 'x/gx $rip…' ./lazy` — watch a GOT slot
  change value across the first call (§36 does this for real).
