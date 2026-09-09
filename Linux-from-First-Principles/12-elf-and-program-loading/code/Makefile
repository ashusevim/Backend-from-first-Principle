CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = elfhead auxv addrs

all: $(PROGS)

elfhead: elfhead.c
auxv: auxv.c
addrs: addrs.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
