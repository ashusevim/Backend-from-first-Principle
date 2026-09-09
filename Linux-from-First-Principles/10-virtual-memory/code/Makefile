CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = maps faults cow

all: $(PROGS)

maps: maps.c
faults: faults.c
cow: cow.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
