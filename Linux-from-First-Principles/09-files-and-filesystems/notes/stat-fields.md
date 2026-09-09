# Notes — `struct stat`, field by field

## Identity and type (`st_mode`, `st_ino`, `st_nlink`, `st_dev`)

- `st_mode`: 16 bits = file type (4 bits: `S_IFREG/S_IFDIR/S_IFLNK/S_IFIFO/
  S_IFSOCK/S_IFCHR/S_IFBLK` — test with `S_ISREG(m)` etc.) + suid/sgid/sticky
  (3 bits) + rwx×3 (9 bits). `ls -l` prints all 10 chars from this alone.
- `st_ino` + `st_dev` TOGETHER identify a file (inode numbers repeat across
  filesystems!). `find -samefile` compares the pair.
- `st_nlink`: name count (files) / subdir-count+2 (dirs: entries `.` + one
  `..` per subdir — `ls -ld`'s number decodes directory size!).

## Size vs allocation (`st_size` vs `st_blocks`)

- `st_size`: logical bytes (what `read` returns).
- `st_blocks`: 512-byte units ACTUALLY allocated. `st_blocks*512 > st_size`
  (slack, tail packing) or `< st_size` (**sparse files**: `ftruncate` to 1GB
  then write 1 byte — `ls` says 1GB, `du` says 4KB, `st_blocks` agrees
  with `du`). Databases/VMs live on sparseness (§33).
- `st_blksize`: preferred I/O chunk (often 4096 — `stat`, `cp`, and stdio
  size their buffers from it).

## The three (+1) timestamps

| Field | Set on | Shown by | Notes |
|-------|--------|----------|-------|
| `st_atime` | read (content access) | `ls -lu` | throttled by `relatime` (default: update only if older than mtime/ctime, or >24h) — raw `atime` died of performance |
| `st_mtime` | content write | `ls -l` | `make`'s entire worldview |
| `st_ctime` | inode change (chmod/chown/link/unlink/rename/WRITE) | `ls -lc` | NOT creation! Unsettable (even by root — forensics anchor). Any mtime bump also bumps ctime |
| `stx_btime` (statx only) | creation | `stat`'s `Birth:` | often unsupported (`0`/`-`): ext4 has it, tmpfs historically didn't |

## Device fields (`st_rdev`, `st_dev`)

- For device nodes: `st_rdev` = `makedev(major, minor)` (`ls -l /dev/sda`
  shows `8, 0`). Major selects the DRIVER, minor the instance.
- `st_dev` = the filesystem's device (compare to group files by mount —
  `find -xdev` / `du -x` use this to not cross filesystems).

## `statx()` extras (the modern call — `statx(dirfd, path, flags, mask, buf)`)

`stx_btime`, `stx_mnt_id` (mount point ID — matches `/proc/self/mountinfo`!),
`stx_attributes` (`STATX_ATTR_COMPRESSED/ENCRYPTED/APPEND…`), atomic
`STATX_BASIC_STATS` mask. glibc's `stat()` still uses `newfstatat`/`statx`
under the hood depending on version — trace and see.
