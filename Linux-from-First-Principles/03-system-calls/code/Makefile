CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = hello_libc hello_raw hello_asm errno_demo vdso_demo mini-strace

all: $(PROGS)

hello_libc: hello_libc.c
hello_raw: hello_raw.c
errno_demo: errno_demo.c
vdso_demo: vdso_demo.c

mini-strace: mini_strace.c
	$(CC) $(CFLAGS) -o $@ $<

# No libc, no startup files, no dynamic loader: _start in hello_asm.s IS the
# entry point. (-static: without it, gcc still emits PT_INTERP and the
# loader runs first — verify with: readelf -l hello_asm | grep -c INTERP)
hello_asm: hello_asm.s
	$(CC) -nostdlib -static -O2 -o $@ $<

clean:
	rm -f $(PROGS)

.PHONY: all clean
