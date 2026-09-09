# 09 — Files and Filesystems

**Question this section answers:** *What is a file — the inode, the name, the
bytes — and how does a path like `/tmp/x` turn into blocks on a disk (or into
kernel-generated text, or into another machine's disk)?*

By the end you can: explain inodes, links, and `stat` cold; predict what
survives `rm`; trace a path through VFS → filesystem → blocks; and read
`mountinfo` like a map of your machine's storage.

---

## 1. The filename is not the file

Unix splits identity three ways:

- **The bytes + metadata** = the **inode** (index node): a number, a type,
  permissions, owner, size, timestamps, block pointers, link count. The inode
  IS the file; everything else points at it.
- **A name** = a **directory entry** (dentry): a mapping `name → inode number`
  inside a directory (which is itself just a file listing such mappings —
  `.` and `..` are real entries, hand-maintained by the filesystem).
- **An open handle** = the fd chain from §08 (fd → description → inode).

```text
/tmp/  (directory: name → inode map)        INODES            BLOCKS
───────────────────────────────             ──────            ──────
"notes.txt" ──▶  987654 ──┐
"photo.jpg" ──▶  987655 ──┼── (same dir)    987654 {size: 41,  ──▶ [data...]
"hardlink"  ──▶  987654 ──┘   (TWO names,    nlink: 2, ...}
                               ONE inode)   987655 {size: 9MB, ──▶ [data...]
                                             nlink: 1, ...}
```

Consequences (verify each in experiment 02):

- **Hard link** = another name for the same inode (`nlink++`). Same
  filesystem only (inode numbers are per-filesystem!), no hardlinked
  directories (they'd create loops the kernel can't garbage-collect).
- **Symlink** = a tiny file whose CONTENT is another path (lives in its own
  inode; `stat` follows it, `lstat` doesn't).
- **`rm`** = `unlink()` = remove ONE name (`nlink--`). Bytes die only at
  `nlink == 0` **AND** no open descriptions (§08's refcount!). An open-but-
  deleted file keeps its blocks until the last close — the `/tmp` + ` deleted`
  pattern (§04's `exe (deleted)`), and why `rm` on a huge open log frees
  nothing until the daemon restarts (or you `: >` truncate it).
- **`mv` within a filesystem** = link new name + unlink old (instant, no
  bytes move). Across filesystems = copy + unlink (slow, non-atomic).
- **`rename()` is atomic**: the new name appears-or-not in one step — the
  basis of crash-safe save (write temp + `fsync` + `rename` over target).

▶ **Code:** `code/linklab.c` — builds this whole section in `/tmp`: file +
hardlink + symlink, then deletes the original and shows what survives.
▶ **Code:** `code/statshow.c` — `stat`/`lstat` decoded field by field
(the `ls -l` first column, derived by hand).

## 2. `stat`: reading an inode

`stat()` (follow links) / `lstat()` (don't) / `fstat()` (by fd) / `statx()`
(superset: birth time, atomic flags) fill `struct stat`:

| Field | Meaning | `ls` shows it as |
|-------|---------|------------------|
| `st_mode` | type + permission bits | `-rw-r--r--` (type char + `rwx`×3 + suid/sgid/sticky) |
| `st_ino` | inode number | `ls -i` |
| `st_nlink` | hard-link count | the number after permissions |
| `st_uid`/`st_gid` | owner | `ls -l` names (§23 resolves them) |
| `st_size` | bytes (files) / apparent (dirs: size of the listing) | `ls -l` 5th column, `ls -s` in blocks |
| `st_blocks` | 512-byte blocks ALLOCATED (≠ size/512! sparse files, inline data) | `du` sums this (§: `du` vs `ls` disagreements explained) |
| `st_atime/mtime/ctime` | accessed / content-modified / inode-CHANGED (not created!) | `ls -l` (mtime), `-u` (atime), `-c` (ctime) |
| `st_btime` (statx) | birth/creation (where the fs tracks it) | `stat`'s `Birth:` (often `-`) |
| `st_blksize` | "preferred I/O size" (hint for buffering) | — |
| `st_dev`/`st_rdev` | which device / device ID (for device nodes) | `ls -l` shows `major, minor` for `/dev/*` |

▶ **Reference:** [notes/stat-fields.md](notes/stat-fields.md) — every field,
every timestamp rule (`relatime`!), and the `du`-vs-`ls` accounting.

## 3. Directories are files (with rules)

A directory maps names to inodes; the kernel enforces the format (you can't
`write()` one — `EISDIR` — only `link`/`unlink`/`mkdir`/`rename` mutate it).
Reading = `getdents64()` syscall (`readdir()` wraps it): entries give
`d_ino` + `d_type` + name — note: NO size/mtime (that's why `ls -l` must
`stat()` EVERY entry: one syscall per file — `strace ls -l /usr/bin | grep
-c newfstatat` and weep; §35 returns to this).

`.`/`..` are physical entries (root's `..` points to itself — the mount
traversal stops there). `d_type` (`DT_REG`/`DT_DIR`/`DT_LNK`/…) saves a
`stat()` for type-only questions (`find -type d` thanks it) — but some
filesystems report `DT_UNKNOWN` (XFS without `ftype`, some network fs):
robust code falls back to `lstat`.

▶ **Code:** `code/myls.c` — `ls -li` rebuilt on `readdir()`: inode + type +
name, no `stat()` needed. (The §38 `mini-ls` starts here.)

## 4. VFS: one interface, every filesystem

User space has ONE file API (`open/read/write/stat/…`). Underneath: ext4,
XFS, Btrfs, tmpfs, procfs, NFS, FUSE… The **VFS** (virtual filesystem switch)
bridges them with operation tables:

```text
read(fd, buf, n) ──▶ VFS: file->f_op->read ──┬── ext4_file_read ──▶ page cache ──▶ disk
                                              ├── pipe_read ──▶ kernel buffer (§17)
                                              ├── socket_recv ──▶ net stack (§19)
                                              ├── proc_read ──▶ GENERATE text (§22)
                                              └── fuse_read ──▶ userspace daemon!
```

Three object types to learn now (deep internals §33): **superblock** (one per
mounted fs: parameters, root inode), **dentry** (one per path component in
cache: name + parent + inode pointer — the path cache that makes repeated
opens fast), **inode** (the file). `slabtop | grep dentry` shows the cache
breathing; `echo 2 > /proc/sys/vm/drop_caches` (root) empties it (benchmarking
hygiene, §35).

**Mounts** graft filesystems onto paths: `mount -t tmpfs none /mnt/ram` makes
`/mnt/ram` a RAM disk. Reads of `/proc/self/mountinfo` show every graft
(mount ID, parent, device, fstype, options — experiment 03 decodes it).
**Bind mounts** (`mount --bind /a /b`) graft a SUBTREE at two places — the
primitive containers abuse for `/proc`, `/sys`, volumes (§27).

▶ **Reference:** [notes/vfs-glossary.md](notes/vfs-glossary.md) — the nouns,
and which section deepens each.

## 5. The filesystem zoo (conceptual tour)

| Filesystem | Stores bytes… | Note |
|------------|---------------|------|
| **ext4** | on block devices (default most places) | extents, journaling (crash consistency), `fsck`-able |
| **XFS** | on block devices (RHEL default) | scales to huge files/fs, online defrag/grow |
| **Btrfs** | on block devices | CoW, snapshots, checksums (a filesystem + volume manager) |
| **tmpfs** | in RAM (swappable!) | `/dev/shm`, often `/tmp` — reboot wipes it |
| **procfs/sysfs** | NOWHERE (generated per-read) | §01/§22: kernel state as files |
| **overlayfs** | across lower+upper dirs (merged view) | Docker image layers, live CDs (§28!) |
| **NFS/CIFS** | on another machine | the `D`-state and stale-handle factory (§04's warning) |
| **FUSE** | wherever a user daemon says | sshfs, s3fs — filesystems as programs |
| **squashfs/erofs** | compressed read-only images | containers, embedded, live media |

`df -T` (per-fs free space via `statfs`) vs `du` (tree walk summing
`st_blocks`): they disagree when files are open-but-deleted (`df` counts
blocks held; `du` can't see the names) — the #1 disk-full mystery, solved by
§1's unlink rule. `lsof +L1` / `ls -l /proc/*/fd | grep deleted` finds them.

## 6. The syscall surface (this section's vocabulary)

| Family | Calls | Note |
|--------|-------|------|
| metadata | `stat/lstat/fstat/statx` | read inodes |
| names | `link/symlink/readlink/unlink/mkdir/rmdir/rename` | mutate directories (all have `*at` variants: race-free relative ops) |
| ownership/mode/time | `chmod/fchmod/chown/utimensat` | §23 explains the checks |
| traversal | `getdents64` (via `readdir`) | list directories |
| space | `statfs/fstatfs` | `df`'s source |
| size | `truncate/ftruncate/fallocate` | grow/shrink/preallocate (databases preallocate!) |
| sync | `fsync/fdatasync/syncfs` | §08's durability (write temp + fsync + rename = crash-safe save) |

▶ **Diagrams:** [diagrams/name-to-bytes.md](diagrams/name-to-bytes.md) —
pathname resolution, hard-vs-symlink, mount grafting, `df`-vs-`du`.

---

## Experiments

```bash
cd experiments/
./01-inode-lab.sh         # statshow vs ls -li vs stat(1): three views, one inode
./02-links-lab.sh         # linklab + by-hand: what survives rm
./03-mounts-and-fs.sh     # findmnt/mountinfo/df decoded; tmpfs + df-vs-du demo
```

## Build the code

```bash
cd code/
make
./statshow /bin/true /tmp
./myls /tmp | head
./linklab
```

## Exercises

1. `echo data > f; ln f h; stat -c '%i %h' f h` — same inode, `nlink=2`.
   Now `rm f; cat h` — explain every step in dentry/inode terms.
2. `ln -s /nonexistent dangle; stat dangle; echo $?; stat -L dangle;
   echo $?` — plain `stat` SUCCEEDS (it shows the LINK itself, like `ls
   -l`); `stat -L` FAILS with ENOENT (following reaches the missing
   target). Which underlying call failed — the `lstat` or the `stat`?
   (statshow's two lines tell you.)
3. Open-but-deleted: `sleep 1000 > /tmp/vanish & sleep 0.2; rm /tmp/vanish;
   ls -l /proc/$!/fd` — find the ` (deleted)` entry. `df` vs `du` on `/tmp`
   now (write 100MB instead of sleep to SEE the gap: `head -c 100M
   /dev/zero > /tmp/vanish & …`). Kill the sleeper: space returns.
4. `strace -e trace=%file ls -l /tmp | head` — count the `newfstatat`s (one
   per entry, §3's tax). Compare `ls /tmp` (pure `getdents`, no stats).
   (Use real strace, or mini-strace with its `newfstatat` decoder.)
5. `findmnt -T /tmp` — what filesystem holds your `/tmp`? If tmpfs: write a
   file, note `free` before/after (RAM-backed, page cache accounting!).
6. (Think) Why can't you hardlink directories, but `.`/`..` ARE effectively
   directory hardlinks? (Because the filesystem maintains exactly those two
   itself, preserving the tree invariant: every dir has exactly one parent
   except root. User hardlinks would break `find ..` and fsck's loop checks.)

## Further reading (in this track)

- Next: [10 — Virtual Memory](../10-virtual-memory/) *(coming soon)* — pages,
  page tables, faults: where file bytes live when mapped (`mmap`).
- Reference: [notes/stat-fields.md](notes/stat-fields.md),
  [notes/vfs-glossary.md](notes/vfs-glossary.md).
- Diagrams: [diagrams/name-to-bytes.md](diagrams/name-to-bytes.md).
