CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -pthread
PROGS = brkvsmap frag arenas

all: $(PROGS)

brkvsmap: brkvsmap.c
frag: frag.c
arenas: arenas.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
