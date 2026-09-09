CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
PROGS = fork_demo zombie orphan minish

all: $(PROGS)

fork_demo: fork_demo.c
zombie: zombie.c
orphan: orphan.c
minish: minish.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
