# Loader Knobs: search order, LD_* vars, sonames

Reference for §13.1/13.4. How `ld.so` finds libs and who can override it.

## Search order (first hit wins)

1. `DT_RPATH` in the binary (DEPRECATED — but still honored FIRST if no
   `LD_LIBRARY_PATH`… confusingly: RPATH loses to LD_LIBRARY_PATH only
   when RUNPATH exists. Read twice. Yes, really.)
2. `LD_LIBRARY_PATH` (colon list; `$ORIGIN` allowed).
3. `DT_RUNPATH` in the binary (modern `-rpath` emits THIS — `readelf -d`
   shows `RUNPATH`, not `RPATH`, on new toolchains).
4. `ld.so.cache` (`/etc/ld.so.cache`, built by `ldconfig` from
   `/etc/ld.so.conf*` — system libs live here; `ldconfig -p | grep foo`).
5. `/lib`, `/usr/lib` (+ multiarch `/lib/x86_64-linux-gnu`).

Our Makefile: `-Wl,-rpath,'$ORIGIN'` → RUNPATH `$ORIGIN` → our `.so`
files load from the program's OWN dir (try `LD_LIBRARY_PATH=/tmp/empty
./lazy`: still runs — RUNPATH covers it. Move `liba.so` away: the
loader names the missing SONAME before ANY symbol work).

## LD_* vars worth knowing

| Var | Effect |
|-----|--------|
| `LD_PRELOAD` | libs FIRST in symbol order (§13.4 experiment) |
| `LD_LIBRARY_PATH` | extra search dirs (order above) |
| `LD_BIND_NOW` | resolve all NOW (startup cost, safer) |
| `LD_DEBUG` | loader narration: `libs bindings symbols statistics`… |
| `LD_TRACE_LOADED_OBJECTS` | =1 → `ldd` mode (this IS what `ldd` sets!) |
| `LD_SHOW_AUXV` | =1 → dump auxv at startup (compare `auxv.c`!) |

**Secure-execution mode**: setuid/setgid (or `AT_SECURE`) IGNORES
`LD_PRELOAD`, `LD_LIBRARY_PATH` (+ friends) — the kernel flags the risk
at exec (§12.3). Try: `LD_PRELOAD=./libhook.so sudo true` → unhooked
(sudo sanitizes too — defense in depth).

## Sonames: the filename contract

`libfoo.so.2.3` (real file) ← `libfoo.so.2` (SONAME — what `DT_NEEDED`
records!) ← `libfoo.so` (linker name — what `-lfoo` finds). Rule: bump
SONAME on ABI break; `ldconfig` rebuilds the cache + links. `readelf -d
libfoo.so | grep SONAME` shows what YOUR binary will record.
