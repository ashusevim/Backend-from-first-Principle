CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -pthread
PROGS = thrinfo race tls

all: $(PROGS)

thrinfo: thrinfo.c
race: race.c
tls: tls.c

clean:
	rm -f $(PROGS)

.PHONY: all clean
