# Lazy Binding: first call vs second call

Visual companion for §13.2. One stub, one slot, two trips.

```text
YOUR TEXT          YOUR DATA (.got.plt)         LIBC (/lib/...)
──────────          ──────────────────          ────────────────
PLT[a]:                                       .───────────────.
  jmp *GOT[a] ──┐                              │ real a():     │
  push #a       │   GOT[a]:                    │   puts(...)   │
  jmp resolver  │    ┌──────────────────┐      │               │
                │    │ BEFORE 1st call: │      '───────────────'
                └───▶│  → PLT[a]+6      │               ▲
                     │  (points back    │               │
                     │   at resolver!)  │               │
                     └──────────────────┘               │
                                                        │
FIRST call a(): resolver runs ── looks up 'a' ──────────┘
  (LD_DEBUG prints: binding ... normal symbol `a')
  ...REWRITES GOT[a] := &real_a... then jumps there.

                     ┌──────────────────┐
                     │ AFTER 1st call:  │
SECOND call a(): ───▶│  GOT[a] = real   │──▶ direct jump. ~ns.
  (no loader, no      │  (frozen if      │
   lookup, no print)  │   RELRO-full)    │
                     └──────────────────┘
```

Measured (§13.2 experiment): `a`'s binding line lands between "before a()"
and "between"; `b`'s between "between" and "after". `LD_BIND_NOW=1`: both
lines BEFORE the first print (and in REVERSE order — loader walks PLT
backwards; order within a batch is unspecified, don't depend on it).
