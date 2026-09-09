# Diagrams — `task_struct` and its shadows in `/proc`

## The kernel object (simplified, but the real field names)

```text
┌─ task_struct ─────────────────────────────────────────────┐
│  pid, tgid, stack, flags                                  │
│  __state ────────────────┐  (R/S/D/T/Z/...)               │
│  prio, static_prio, policy, sched_class ──► (scheduler §06)│
│  parent ──▶ task_struct   children/sibling ──▶ (tree §05)  │
│  mm ──────┐                                               │
│  files ───┼─── pointers to the process's RESOURCES        │
│  cred ────┘                                               │
│  signal ──▶ sighand ──▶ handlers + masks (§07)            │
│  nsproxy ──▶ namespaces (§25)    cgroups ──▶ (§26)        │
│  exit_code, exit_state ──▶ (reaping §05)                  │
└───────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─ mm_struct ───┐  ┌─ files_struct ┐  ┌─ cred ─────────┐
│ mmap ──▶ VMAs │  │ fdtable ──▶   │  │ uid, euid,     │
│ brk, start_   │  │  [0] terminal │  │ suid, gid, ... │
│ stack, ...    │  │  [1] pipe     │  │ capabilities   │
└───────────────┘  │  [3] socket   │  └────────────────┘
                   └───────────────┘
```

## Where each rendering comes from

```text
task_struct field(s)              you read it via
────────────────────              ──────────────
pid, tgid, comm, __state, ppid  ──▶ /proc/<pid>/status, stat ──▶ ps
parent/children                 ──▶ /proc/<pid>/children ──▶ pstree
mm ──▶ VMAs                     ──▶ /proc/<pid>/maps, smaps (§10)
mm ──▶ rss, vsize               ──▶ top's RES/VIRT (§10, §35)
files ──▶ fdtable               ──▶ /proc/<pid>/fd, fdinfo (§08)
cred                            ──▶ status (Uid:/Gid:), ps USER (§23)
sighand                         ──▶ status (SigPnd/SigBlk/SigCgt) (§07)
sched fields, utime/stime       ──▶ stat fields 14/15 ──▶ top %CPU (§06)
exit_code                       ──▶ visible only to parent via wait() (§05)
start_time                      ──▶ ps lstart (§05)
```

## State machine (the letters, as transitions)

```text
                    fork()/clone()
                         │
                         ▼
               ┌─────► (R) ◄─────┐  preempted / timeslice over
               │       │ │       │  (back to runqueue)
               │       │ │ schedule() picks next
               │       │ ▼       │
               │   running on CPU│
               │       │         │
     event/    │       │ sleep   │ wakeup
     signal    │       ▼         │
               │   (S)/(D) ──────┘
               │       │
    SIGSTOP/   │       │ SIGSTOP          SIGCONT
    tracer     │       ▼                  ──────▶ (R)
               │   (T)/(t) ─── SIGKILL ──▶ dead
               │       │
    exit()     │       │ exit()
               │       ▼
               │   (Z) ─── parent wait() ──▶ gone (X)
               │       │
               └───────┘  (orphan Z: reparented to
                           subreaper/init, reaped there)
```
