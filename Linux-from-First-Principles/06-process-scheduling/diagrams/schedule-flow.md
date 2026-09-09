# Diagrams — How the scheduler picks and switches

## The pick path (per CPU, on tick / wakeup / sleep / yield)

```text
event: timer tick │ task wakes │ task sleeps │ new task enqueued
                 ▼
        ┌────────────────┐
        │ scheduler_tick │  update current's vruntime += delta × weight-factor
        │  / try_to_wake │  (CFS accounting — every task pays for what it burns)
        └───────┬────────┘
                ▼
        ┌────────────────┐   yes  ┌──────────────────┐
        │ someone more   ├───────▶│ set need_resched │
        │ deserving?     │        │ (preempt at next │
        └───────┬────────┘        │  opportunity)     │
                │ no              └──────────────────┘
                ▼
        ┌────────────────┐
        │ pick_next_task │  classes in order: stop → deadline → rt → fair → idle
        │  fair: leftmost│  fair class: leftmost (= smallest vruntime) in rbtree
        │  in rbtree     │
        └───────┬────────┘
                ▼
        ┌────────────────┐
        │ context_switch │  switch_to (regs, kernel stack) + switch_mm (cr3!)
        │  prev → next   │  ~1-3µs + TLB/cache damage (§10: why switches cost)
        └────────────────┘
```

## CFS in one picture (two tasks, one CPU)

```text
time ──────────────────────────────────────────────────────────▶
A (nice 0, w=1024)  ████████░░░░░░░░████████░░░░░░░░████████░░░░░░░░  (~90%)
B (nice 10, w=110)  ░░░░░░░░██░░░░░░░░░░░░░░██░░░░░░░░░░░░░░██░░░░░░  (~10%)
                    ▲       ▲
                    │       └── B's vruntime grew ~9× per ns burned,
                    │           so A is "smallest" ~9× as often
                    └── pick smallest vruntime, run till not-smallest
```

## Where switches come from (what moves the counters)

```text
VOLUNTARY (ru_nvcsw)                    INVOLUNTARY (ru_nivcsw)
task calls:                             kernel decides:
 • nanosleep / sleep                    • slice expired (tick)
 • read on empty pipe/socket            • higher-weight task woke up
 • waitpid on live child                • RT task woke up (preempts ALL fair)
 • mutex/condvar wait (§15)             • migration to another CPU
 • exit! (the last yield)               • (affinity revokes your CPU)
```

## Class ladder (who preempts whom — one glance)

```text
  stop → deadline → FIFO/RR(99..1) → CFS(normal/batch by vruntime) → idle-task
   ▲                                                              (SCHED_IDLE*)
   │                                                              runs only if
   └── a runnable task here preempts EVERYTHING below              nothing else
                                                                   wants the CPU
```
