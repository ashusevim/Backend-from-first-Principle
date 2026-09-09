CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -fPIC
PROGS = lazy dlmod whofirst
SOLIBS = liba.so libb.so libwho.so libhook.so

all: $(PROGS) $(SOLIBS)

%.so: %.c
	$(CC) $(CFLAGS) -shared $^ -o $@

lazy: lazy.c liba.so libb.so
	$(CC) $(CFLAGS) lazy.c -L. -la -lb -Wl,-rpath,'$$ORIGIN' -o $@

dlmod: dlmod.c
	$(CC) $(CFLAGS) dlmod.c -ldl -o $@

whofirst: whofirst.c libwho.so
	$(CC) $(CFLAGS) whofirst.c -L. -lwho -Wl,-rpath,'$$ORIGIN' -o $@

clean:
	rm -f $(PROGS) $(SOLIBS)

.PHONY: all clean
