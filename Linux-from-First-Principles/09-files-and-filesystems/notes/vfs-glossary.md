# Notes — VFS glossary (the nouns, with pointers)

| Noun | Kernel object | One-liner | Deep dive |
|------|---------------|-----------|-----------|
| superblock | `struct super_block` | one per MOUNTED fs: type, options, root dentry, ops | §33 |
| dentry | `struct dentry` | one per cached path COMPONENT: name + parent + inode | §33 (dcache, reclaim) |
| inode | `struct inode` | the file: metadata + `i_op` + `i_fop` + data pointers | §33 |
| file | `struct file` | §08's open file description (offset + flags + dentry) | §08 |
| vfsmount | `struct mount` | a graft: fs × mountpoint × parent mount × flags | §25 (mount ns!), §27 |
| file ops | `struct file_operations` | the dispatch table: `read/write/mmap/poll/…` per file KIND | §32 (how syscalls dispatch) |
| inode ops | `struct inode_operations` | namespace ops: `lookup/create/link/unlink/mkdir/rename` | §33 |
| page cache | address_space pages | file content cached in RAM (write-back!) | §10, §33 |
| dentry cache | slab + LRU | resolved paths cached (negative too: ENOENT cached!) | §33 |

## Pathname resolution in 20 seconds (`namei`)

`/a/b/c`: start at process root (or cwd if relative) → for each component:
hash + lookup in parent's dcache → hit? use it : call parent's `lookup` op
(fs reads the directory) → follow symlinks (up to 40, then `ELOOP`) →
cross mountpoints (descend into the grafted root) → final dentry + inode.
Permission: `x` on EVERY directory traversed (even to stat the target!).

## Mount propagation (one paragraph, full story §27)

Bind mounts + namespaces raise the question: if I mount under a shared
subtree, who else sees it? Answer: propagation types (`shared/private/slave/
unbindable`, `mount --make-*`). Containers rely on PRIVATE mounts for `/`
(else container mounts leak to the host!). `findmnt -o +PROPAGATION` shows it.
