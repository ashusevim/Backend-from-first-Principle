#!/bin/bash
# 03 — Mounts and filesystems: mountinfo decoded; tmpfs + df-vs-du demo.
# SAFE: temp files under /tmp and /dev/shm only; ~50M transient disk use.
#
# Run:  bash 03-mounts-and-fs.sh
set -u
EXPDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$EXPDIR/../code" && make -s statshow
CODEDIR=$PWD
S03="$EXPDIR/../../03-system-calls/code"

echo "=== 1. the mount table, decoded (findmnt + mountinfo) ==="
findmnt -R / --output TARGET,SOURCE,FSTYPE 2>/dev/null | head -10 || mount | head -10
echo "--- /proc/self/mountinfo, one line per graft ---"
awk '{for(i=1;i<=NF;i++) if($i=="-") printf "  id=%s parent=%s %s type %s opts=%s\n", $1,$2,$5,$(i+1),$6}' /proc/self/mountinfo | head -8

echo
echo "=== 2. df: which filesystem backs each path ==="
df -T / /tmp /dev/shm 2>/dev/null | awk 'NR>1 {printf "  %-8s %-10s %s\n", $1, $2, $7}'

echo
echo "=== 3. df-vs-du: the open-but-deleted money gap ==="
LAB=$(mktemp -d /tmp/du-XXXXXX)
trap 'rm -rf "$LAB"' EXIT
fallocate -l 50M "$LAB/big"      # instant, REAL blocks (not sparse)
echo "du sees: $(du -h "$LAB/big" | cut -f1)"
FREE0=$(df -k /tmp | awk 'NR==2 {print $4}')
sleep 300 < "$LAB/big" &         # holder: keeps blocks alive after rm
PID=$!
sleep 0.2; rm "$LAB/big"
echo "after rm (holder alive): du sees: $(du -sh "$LAB" | cut -f1)"
FREE1=$(df -k /tmp | awk 'NR==2 {print $4}')
echo "df free before rm: ${FREE0}K, after rm: ${FREE1}K (delta ~0 => blocks HELD)"
ls -l /proc/$PID/fd | grep -o 'big (deleted)'
kill $PID 2>/dev/null; wait $PID 2>/dev/null
FREE2=$(df -k /tmp | awk 'NR==2 {print $4}')
echo "holder killed: df free now ${FREE2}K (gap closed: $(( (FREE2 - FREE1) / 1024 ))M returned)"

echo
echo "=== 4. tmpfs: /dev/shm is RAM wearing a filesystem costume ==="
findmnt -T /dev/shm --output TARGET,SOURCE,FSTYPE
S0=$(df -k /dev/shm | awk 'NR==2 {print $3}')
head -c 8M /dev/zero > /dev/shm/s09demo
S1=$(df -k /dev/shm | awk 'NR==2 {print $3}')
echo "used before: ${S0}K, after 8M write: ${S1}K (RAM-backed; reboot wipes it; swappable)"
rm -f /dev/shm/s09demo

echo
echo "=== 5. pseudofiles: blocks=0 is the tell (no disk behind them) ==="
stat -c '  %n: size=%s blocks=%b' /proc/version /sys/devices/system/cpu/online
echo "  proc reports size 0, sysfs a conventional 4096 — but BOTH have 0 blocks."
echo -n "  /proc/version: "; head -c 50 /proc/version; echo " ..."
echo -n "  cpu/online: "; cat /sys/devices/system/cpu/online

echo
echo "=== 6. stat's true shape: newfstatat via the track's OWN tracer ==="
echo hi > /tmp/at-probe
PREBUILT=0; [ -x "$S03/mini_strace" ] && PREBUILT=1   # don't delete the user's own build
if (cd "$S03" && make -s mini_strace 2>/dev/null) && [ -x "$S03/mini_strace" ]; then
    "$S03/mini_strace" "$CODEDIR/statshow" /tmp/at-probe 2>&1 | grep -E 'newfstatat' | head -4
    echo "(0xffffff9c = AT_FDCWD = start at cwd; glibc routes stat/lstat here)"
    [ $PREBUILT -eq 0 ] && rm -f "$S03/mini_strace"   # leave S03 as we found it
elif command -v strace > /dev/null; then
    strace -e trace=openat,newfstatat -o /tmp/at.trace "$CODEDIR/statshow" /tmp/at-probe > /dev/null 2>&1
    grep -E 'newfstatat' /tmp/at.trace | head -4
else
    echo "(no tracer available — on your machine: strace -e trace=openat,newfstatat ./statshow FILE)"
fi
rm -f /tmp/at-probe /tmp/at.trace
