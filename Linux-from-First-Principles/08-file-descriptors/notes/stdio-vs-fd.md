# Notes — stdio vs raw fds (two layers, one kernel object)

## The mapping

```text
fopen(path, "w")  ──▶ open() + malloc(FILE{fd, buffer, ...})
fileno(fp)        ──▶ the wrapped fd number
fdopen(fd, "r")   ──▶ wrap YOUR fd in a FILE (fclose now OWNS the fd!)
fclose(fp)        ──▶ fflush + close(fd) + free
```

## Buffering modes (`setvbuf`)

| Mode | Flushes when | Used for |
|------|--------------|----------|
| `_IONBF` | every call (no buffer) | stderr (always!), minish's stdout (§05) |
| `_IOLBF` | every newline | stdout to a TERMINAL |
| `_IOFBF` | buffer full (4–8KB) / `fflush` / `fclose` / `exit` | stdout to pipe/file, all explicitly-opened files |

(The §05 fork disaster, retold: block-buffered parent output duplicated into
the child. The §07 async-safety rule, retold: `printf` in a handler races the
buffer. Same buffer, three sections — now you see why it matters.)

## Mixing rules (when both layers touch one description)

1. `write()` jumps ahead of buffered `printf` output (buffer flushes later,
   at the then-current offset — interleaved garbage).
2. `read()` after `fread()` misses bytes the library pre-buffered (stdio
   read-ahead stole them from the offset).
3. `lseek()` confuses stdio's model (it doesn't know you moved).
4. Verdict: one layer per description. Convert (`fdopen`) or pick sides.

## `fflush` vs `fsync` (different planets)

- `fflush(fp)`: user→kernel (empties the stdio buffer via `write()`).
  Data is in the PAGE CACHE now — safe from crash, NOT from power loss.
- `fsync(fd)` / `fdatasync(fd)`: kernel→storage (waits for the device).
  THIS is durability (databases, §33). Neither is implied by `close()`!
