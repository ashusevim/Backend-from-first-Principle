CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = procself ppid_chain

all: $(PROGS)

procself: procself.c
ppid_chain: ppid_chain.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
