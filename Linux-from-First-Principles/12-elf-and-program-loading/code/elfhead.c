/* elfhead.c — ELF header + program headers, parsed BY HAND (no libelf).
 *
 * Reads the 64-byte Ehdr (magic, class, type EXEC/DYN, entry point) then
 * walks the Phdr array: LOAD (file-offset -> vaddr, filesz vs memsz, RWE),
 * INTERP (the loader path — §13), DYNAMIC, NOTE. Its LOAD list PREDICTS
 * the process map (§10.6): experiment 01 holds them side by side.
 *
 * Build:  make elfhead
 * Run:    ./elfhead /bin/true
 *         ./elfhead /bin/true | grep LOAD
 */
#define _GNU_SOURCE
#include <elf.h>
#include <stdio.h>
#include <stdlib.h>

static const char *etype(uint16_t t)
{
    switch (t) {
    case ET_EXEC: return "EXEC (fixed load address)";
    case ET_DYN: return "DYN (PIE/shared — loads anywhere: ASLR, §12.4)";
    case ET_REL: return "REL (object file, not runnable)";
    default: return "?";
    }
}

static const char *ptype(uint32_t t)
{
    switch (t) {
    case PT_LOAD: return "LOAD  ";
    case PT_INTERP: return "INTERP";
    case PT_DYNAMIC: return "DYNAMIC";
    case PT_NOTE: return "NOTE  ";
    case PT_PHDR: return "PHDR  ";
    case PT_GNU_RELRO: return "RELRO ";
    case PT_GNU_STACK: return "STACK ";
    case PT_GNU_EH_FRAME: return "EHFRM ";
    case PT_GNU_PROPERTY: return "GPROP ";
    default: return "OTHER ";
    }
}

static void flags(char *out, uint32_t f)
{
    out[0] = (f & PF_R) ? 'R' : ' ';
    out[1] = (f & PF_W) ? 'W' : ' ';
    out[2] = (f & PF_X) ? 'E' : ' ';
    out[3] = '\0';
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "usage: %s elf-file\n", argv[0]);
        return 1;
    }
    FILE *f = fopen(argv[1], "rb");
    if (!f) {
        perror("fopen");
        return 1;
    }
    Elf64_Ehdr eh;
    if (fread(&eh, 1, sizeof(eh), f) != sizeof(eh)) {
        fprintf(stderr, "short read (not ELF?)\n");
        return 1;
    }
    if (eh.e_ident[EI_MAG0] != ELFMAG0 || eh.e_ident[EI_MAG1] != ELFMAG1 ||
        eh.e_ident[EI_MAG2] != ELFMAG2 || eh.e_ident[EI_MAG3] != ELFMAG3) {
        fprintf(stderr, "bad magic (not ELF)\n");
        return 1;
    }
    printf("%s: %s-bit %s-endian, type=%s\n", argv[1],
           eh.e_ident[EI_CLASS] == ELFCLASS64 ? "64" : "32",
           eh.e_ident[EI_DATA] == ELFDATA2LSB ? "LSB" : "MSB",
           etype(eh.e_type));
    printf("entry=0x%lx  phoff=%lu phnum=%d\n", (unsigned long)eh.e_entry,
           (unsigned long)eh.e_phoff, eh.e_phnum);
    printf("%-7s %-18s %-18s %-9s %-9s %s\n", "SEG", "VADDR", "OFFSET",
           "FILESZ", "MEMSZ", "FLG");

    if (fseek(f, (long)eh.e_phoff, SEEK_SET) != 0) {
        perror("fseek phoff");
        return 1;
    }
    char fl[4];
    for (int i = 0; i < eh.e_phnum; i++) {
        Elf64_Phdr ph;
        if (fread(&ph, 1, sizeof(ph), f) != sizeof(ph)) {
            fprintf(stderr, "short phdr %d\n", i);
            return 1;
        }
        flags(fl, ph.p_flags);
        printf("%-7s 0x%-16lx 0x%-16lx %-9lu %-9lu %s", ptype(ph.p_type),
               (unsigned long)ph.p_vaddr, (unsigned long)ph.p_offset,
               (unsigned long)ph.p_filesz, (unsigned long)ph.p_memsz, fl);
        if (ph.p_type == PT_LOAD && ph.p_memsz > ph.p_filesz)
            printf("  <- .bss lives in this %lu-byte gap (free zeros!)",
                   (unsigned long)(ph.p_memsz - ph.p_filesz));
        if (ph.p_type == PT_INTERP) {
            long here = ftell(f);
            char interp[128] = "";
            if (fseek(f, (long)ph.p_offset, SEEK_SET) == 0)
                if (fread(interp, 1, sizeof(interp) - 1, f) > 0)
                    printf("  <- loader: %s (§13!)", interp);
            fseek(f, here, SEEK_SET);
        }
        printf("\n");
    }
    fclose(f);
    return 0;
}
