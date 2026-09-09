CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = spinner sched_info ctxcount

all: $(PROGS)

spinner: spinner.c
sched_info: sched_info.c
ctxcount: ctxcount.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
