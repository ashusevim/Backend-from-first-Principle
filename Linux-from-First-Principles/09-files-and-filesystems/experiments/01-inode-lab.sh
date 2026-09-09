#!/bin/bash
# 01 — Inode lab: statshow vs ls -li vs stat(1) — three views, one inode.
# SAFE: temp files under /tmp only.
#
# Run:  bash 01-inode-lab.sh
set -u
cd "$(dirname "$0")/../code" && make -s statshow myls
CODEDIR=$PWD

LAB=$(mktemp -d /tmp/ino-XXXXXX)
trap 'rm -rf "$LAB"' EXIT
cd "$LAB"

echo "=== 1. stat(1): the full inode readout ==="
echo hello > a
stat a
echo "(spot every README §2 field: mode, ino, nlink, size, blocks, times)"

echo
echo "=== 2. same inode through OUR decoder (statshow) ==="
"$CODEDIR/statshow" a

echo
echo "=== 3. size vs blocks: 1 byte rents a whole block ==="
echo -n x > tiny
BLK=$(stat -c %b tiny)
echo "size=$(stat -c %s tiny) byte of content costs $(( BLK * 512 )) bytes on disk ($BLK block minimum)"

echo
echo "=== 4. the mode column, bit by bit (chmod surgery) ==="
echo secret > f
chmod 400 f
echo -n "400: read ok / write: "; echo x >> f 2>&1 || echo "DENIED (w missing)"
chmod 200 f
echo -n "200: write ok / read: "; cat f 2>&1 || echo "DENIED (r missing)"
chmod 600 f
mkdir d; echo hi > d/inner
chmod 644 d
echo -n "dir=644 (no x): list ok, reach in: "; cat d/inner 2>&1 || echo "DENIED (x = lookup)"
chmod 111 d
echo -n "dir=111 (x only): list: "; ls d 2>&1 || echo "DENIED (r = listing)"
echo -n "dir=111 (x only): reach in: "; cat d/inner
chmod 755 d
umask 077; : > locked; stat -c 'umask 077 => new file %a' locked
umask 022; : > openf;  stat -c 'umask 022 => new file %a' openf
echo "suid/sticky in the wild:"; stat -c '  %A %n' /usr/bin/passwd /tmp
"$CODEDIR/statshow" f d | grep -E '===|lstat'

echo
echo "=== 5. myls == ls -li (readdir only, zero stat calls) ==="
: > /tmp/myls.txt; : > /tmp/lsli.txt   # pre-touch: both listings see both
"$CODEDIR/myls" /tmp | tail -n +2 | sort -k3 > /tmp/myls.txt
ls -lai /tmp | awk 'NR>1 && $10!="." && $10!=".." {printf "%-12s %s  %s\n", $1, substr($2,1,1), $10}' | sort -k3 > /tmp/lsli.txt
if diff -q /tmp/myls.txt /tmp/lsli.txt > /dev/null; then
    echo "IDENTICAL: $(wc -l < /tmp/myls.txt) entries"
else
    echo "DIFF (investigate!):"; diff /tmp/myls.txt /tmp/lsli.txt | head
fi
echo "--- myls observes itself: the opendir fd in its OWN listing ---"
"$CODEDIR/myls" /proc/self/fd
echo "(fd 3 = the DIR stream being read — observer effect, §01/§08 again)"
