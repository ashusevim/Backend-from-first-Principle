#!/bin/bash
# 02 — Links lab: linklab + by-hand — what survives rm.
# SAFE: temp dir under /tmp only.
#
# Run:  bash 02-links-lab.sh
set -u
cd "$(dirname "$0")/../code" && make -s statshow linklab
CODEDIR=$PWD

LAB=$(mktemp -d /tmp/lnk-XXXXXX)
trap 'rm -rf "$LAB"' EXIT
cd "$LAB"

echo "=== 1. by hand: one inode, four names (well — three + a copy) ==="
echo payload > orig
ln orig hard            # same inode, nlink 1->2
ln -s orig sym          # OWN inode, content = the path "orig"
cp orig copy            # OWN inode, OWN bytes
stat -c '  %n: ino=%i links=%h size=%s' orig hard sym copy
echo "--- rm orig ---"
rm orig
stat -c '  %n: ino=%i links=%h size=%s' hard sym copy
echo -n "hard still reads: "; cat hard
echo -n "sym now: "; cat sym 2>&1 || echo "DANGLING (target name gone)"
echo -n "copy unaffected: "; cat copy

echo
echo "=== 2. three views of the symlink: stat, stat -L, statshow ==="
stat -c '  no -L (link itself): ino=%i size=%s' sym
stat -L -c '  with -L (target):    ino=%i size=%s' sym 2>/dev/null || echo "  with -L: FAILED — dangling, nothing to follow"
"$CODEDIR/statshow" sym

echo
echo "=== 3. the whole lab in one binary ==="
"$CODEDIR/linklab"

echo
echo "=== 4. mv within a filesystem: names move, bytes don't ==="
echo v1 > f; I0=$(stat -c %i f)
mv f g; I1=$(stat -c %i g)
echo "inode before mv: $I0, after: $I1 (same => zero bytes copied)"
echo v2 > g.tmp && mv g.tmp g    # write temp + atomic rename = crash-safe save
cat g

echo
echo "=== 5. teaser: open-but-deleted (experiment 03 §3 shows the money gap) ==="
sleep 300 > vanish &
PID=$!
sleep 0.2; rm vanish
ls -l /proc/$PID/fd | grep deleted
kill $PID 2>/dev/null
echo "(blocks held until last close — rm freed NOTHING yet)"
