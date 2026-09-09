#!/bin/bash
# 01 — Read an ELF: readelf -h/-l/-S vs elfhead — three views agree.
# SAFE: read-only.
#
# Run:  bash 01-read-an-elf.sh
set -u
cd "$(dirname "$0")/../code" && make -s elfhead
CODEDIR=$PWD
BIN=/bin/true

echo "=== 1. the header: readelf -h vs elfhead ==="
readelf -h $BIN | grep -E 'Class|Type|Machine|Entry'
"$CODEDIR/elfhead" $BIN | head -2

echo
echo "=== 2. the loader's view: readelf -l (LOADs become VMAs) ==="
readelf -lW $BIN | grep -E 'LOAD|INTERP' | sed 's/^/  /'
echo "--- elfhead's LOADs (predict the map!) ---"
"$CODEDIR/elfhead" $BIN | grep LOAD | sed 's/^/  /'

echo
echo "=== 3. the linker's view: sections (.text/.data/.bss sizes) ==="
readelf -SW $BIN | grep -E '\.(text|rodata|data|bss)' | awk '{printf "  %-12s size=%8s type=%s\n", $2, $6, $3}' | head -6
echo "(Name, Size; .bss costs file bytes: 0 — the memsz gap)"

echo
echo "=== 4. .bss is free (5-line proof) ==="
echo 'int big[1<<20]; int main(){return big[999];}' > /tmp/bss.c
echo 'int big[1<<20]={1}; int main(){return big[999];}' > /tmp/dat.c
gcc -O2 /tmp/bss.c -o /tmp/bss && gcc -O2 /tmp/dat.c -o /tmp/dat
echo "BSS binary:  $(stat -c %s /tmp/bss) bytes"
echo "DATA binary: $(stat -c %s /tmp/dat) bytes (4 MiB of ones, on disk!)"
rm -f /tmp/bss.c /tmp/dat.c /tmp/bss /tmp/dat
