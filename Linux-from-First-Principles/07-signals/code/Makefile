CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = sigdemo sigblock fault

all: $(PROGS)

sigdemo: sigdemo.c
sigblock: sigblock.c
fault: fault.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
