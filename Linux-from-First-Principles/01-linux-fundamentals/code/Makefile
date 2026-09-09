CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = identity argenv list_fds

all: $(PROGS)

identity: identity.c
argenv: argenv.c
list_fds: list_fds.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
