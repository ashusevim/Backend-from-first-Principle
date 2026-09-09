# hello_asm.s — Hello world with NO libc at all.
#
# _start is the true entry point (no crt startup, no main). We set up the
# x86-64 syscall ABI by hand: rax=number, rdi/rsi/rdx=args, `syscall`.
# Linked with -nostdlib, so there is no loader burst: the trace is exactly
# 2 syscalls (write, exit).
#
# Build:  make hello_asm
# Run:    ./hello_asm; echo "exit code: $?"

    .global _start
    .text
_start:
    # write(1, msg, msglen)
    mov $1, %rax            # __NR_write
    mov $1, %rdi            # fd = stdout
    lea msg(%rip), %rsi     # buf
    mov $msglen, %rdx       # count
    syscall                 # rax <- bytes written (or -ERRNO)

    # exit_group(0) — same as libc exit() uses
    mov $231, %rax          # __NR_exit_group
    xor %rdi, %rdi          # status = 0
    syscall
    # not reached

    .section .rodata
msg:
    .ascii "hello from raw assembly\n"
    .equ msglen, . - msg
