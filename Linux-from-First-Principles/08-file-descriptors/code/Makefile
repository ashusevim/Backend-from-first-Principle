CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = fdchain forkshare redirect

all: $(PROGS)

fdchain: fdchain.c
forkshare: forkshare.c
redirect: redirect.c

clean:
	rm -f $(PROGS) redirect-out.txt

.PHONY: all clean
