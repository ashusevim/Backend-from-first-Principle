# Diagrams — Names, inodes, mounts, bytes

## Pathname resolution (`open("/var/log/x", …)`)

```text
"/" ──▶ dentry(var) ──▶ dentry(log) ──▶ dentry(x) ──▶ inode ──▶ open file desc
 │         │ (x ok?)       │ (x ok?)       │            │
 │         ▼               ▼               ▼            ▼
 │      dcache HIT? ──no──▶ fs lookup() reads dir blocks from disk
 │         │
 │      mountpoint crossed? ──yes──▶ descend into grafted fs root
 │         │
 │      symlink? ──yes──▶ restart with target text (≤40 hops, else ELOOP)
 ▼
each step needs x-permission on the directory (even the LAST one for stat!)
```

## Hard link vs symlink vs copy (what `rm orig` leaves)

```text
BEFORE:  orig ──▶ inode 100 (nlink=2)      AFTER rm orig:
         hard ──▶ inode 100  (same!)       hard ──▶ inode 100 (nlink=1, FINE)
         sym  ──▶ inode 101 ──▶ "orig"      sym  ──▶ inode 101 ──▶ "orig" (DANGLING:
         copy ──▶ inode 102 (own bytes)     lstat ok, stat/open → ENOENT)
                                           copy ──▶ inode 102 (untouched)
```

## Mount grafting (`mount -t tmpfs none /mnt/ram`)

```text
BEFORE                              AFTER
parent fs: /                         parent fs: /
  mnt/ ──▶ (empty dir inode)           mnt/ ──▶ [GRAFT: tmpfs superblock]
    (anything under mnt/                 ram/ ──▶ (tmpfs root: RAM, empty)
     is SHADOWED while                   (parent's old mnt/ contents hidden,
     mounted)                             revealed again at umount)
```

## `df` vs `du` (why they disagree)

```text
df /tmp ──statfs──▶ superblock counters: blocks total/free
                      (counts ALL allocated blocks, named or not)

du /tmp ──tree walk──▶ sum of st_blocks over VISIBLE names
                      (misses open-but-deleted: no name to walk!)

GAP = open-but-deleted (+ metadata overhead): find with
  ls -l /proc/*/fd 2>/dev/null | grep deleted
```

## Crash-safe save (the rename idiom)

```text
write("f.tmp") ──▶ fsync("f.tmp") ──▶ rename("f.tmp", "f") ──▶ fsync(dir)
   │                  │                    │ (ATOMIC:            │ (persist the
   │                  │              old-or-new, never           │  rename itself!)
   │                  │              half)                      │
   ▼                  ▼                    ▼                    ▼
bytes staged    staged bytes          name swapped         namespace durable
                DURABLE         (readers never see a partial file)
```
