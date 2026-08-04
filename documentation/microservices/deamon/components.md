# Daemon Codebase Documentation

This document provides an overview of the core components that make up the daemon. Each component is responsible for a single concern, allowing the daemon to remain modular, extensible, and easy to maintain.

---

# Job Processor

## Overview

The Job Processor is the execution engine of the daemon.

It continuously retrieves queued jobs from the database, safely claims ownership of those jobs, executes the appropriate action, updates execution state, and manages retries when failures occur.

The processor is intentionally isolated from business logic. It does not know how individual jobs work—it only coordinates their execution.

---

## Responsibilities

* Poll queued jobs
* Claim jobs safely
* Execute registered actions
* Update execution status
* Handle retries
* Detect execution timeouts
* Record failures
* Move exhausted jobs to the Dead Letter Queue

---

## Job Lifecycle

```text
                 New Job
                    │
                    ▼
              Status: queued
                    │
                    ▼
          Job Processor Polls Queue
                    │
                    ▼
          Claim Job (Database Lock)
                    │
                    ▼
             Status: running
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
      Success             Exception
          │                   │
          ▼                   ▼
     Status: done      Retry Available?
                              │
                     ┌────────┴────────┐
                     │                 │
                     ▼                 ▼
              Increment Retry      No Retries Left
                     │                 │
                     ▼                 ▼
             Status: queued       Dead Letter Queue
```

---

# Action Registry

## Overview

The Action Registry acts as the central catalogue of executable actions.

Instead of the processor containing conditional logic for every job type, each action registers itself with the registry during startup.

The processor resolves actions through this registry using the job type.

---

## Responsibilities

* Store registered actions
* Prevent duplicate registrations
* Validate action metadata
* Resolve handlers by job type

---

# Dependency Resolver

## Overview

The Dependency Resolver manages shared services required by actions.

Rather than constructing dependencies inside each action, they are resolved centrally and injected when needed.

This keeps actions focused solely on business logic.

---

## Responsibilities

* Resolve shared services
* Manage singleton instances
* Reduce coupling
* Centralize dependency creation

---

# Scheduler

## Overview

The Scheduler discovers scheduled jobs and publishes them at the appropriate execution time.

It separates recurring work from immediate job execution.

---

## Responsibilities

* Discover scheduled jobs
* Evaluate schedules
* Publish executable jobs
* Prevent duplicate scheduling

---

# Dead Letter Queue

## Overview

The Dead Letter Queue stores jobs that can no longer be processed successfully.

Rather than silently discarding failed jobs, they are preserved for inspection and replay.

---

## Responsibilities

* Store permanently failed jobs
* Preserve failure information
* Support manual replay
* Prevent infinite retry loops

---

## When Jobs Enter the DLQ

A job enters the Dead Letter Queue when:

* Maximum retry count has been reached.
* Execution repeatedly fails.
* Recovery is no longer possible.

---

# gRPC Interface

## Overview

The daemon exposes a gRPC interface that allows other services to publish work.

This interface acts as the public entry point into the job processing system.

---

## Responsibilities

* Accept publish requests
* Validate request structure
* Persist jobs
* Return acknowledgement

---

## Typical Flow

```text
Client Service
      │
      ▼
 Publish()
      │
      ▼
 Save Job
      │
      ▼
 Database Queue
      │
      ▼
 Job Processor
```

---

# Database Layer

## Overview

The database layer guarantees that multiple daemon instances can process jobs safely without executing the same job twice.

Row-level locking is used when claiming work.

---

## Responsibilities

* Persist jobs
* Claim jobs atomically
* Update execution state
* Store retry counts
* Record execution failures

---

## Safe Job Claiming

Jobs are claimed inside a transaction using row-level locking.

Typical implementations use:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED
```

This ensures that:

* each job is claimed by only one processor,
* workers do not block each other unnecessarily,
* horizontal scaling is safe.

---

# Health Monitoring

## Overview

Health monitoring exposes the daemon's operational state.

Its primary purpose is to allow external systems to determine whether the daemon is functioning correctly.

While commonly used by orchestration platforms such as Kubernetes, it also provides a simple way to observe the daemon's readiness and liveness.

---

## Responsibilities

* Report daemon readiness
* Report daemon liveness
* Indicate startup completion
* Detect unhealthy execution states

---

# Component Relationships

```text
                   Publish Request
                          │
                          ▼
                    gRPC Interface
                          │
                          ▼
                    Database Layer
                          │
                          ▼
                    Job Processor
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
   Action Registry   Dependency Resolver   Scheduler
          │                                 │
          ▼                                 ▼
     Execute Action                  Publish Jobs
          │
          ▼
      Job Complete
          │
          ▼
     Dead Letter Queue
      (on permanent failure)
```

---

# Design Principles

The daemon architecture follows several key principles:

* **Single Responsibility** — Each component performs one well-defined task.
* **Loose Coupling** — Components communicate through contracts rather than implementation details.
* **Extensibility** — New actions and features can be added without modifying the processor.
* **Scalability** — Database locking enables multiple daemon instances to process jobs safely.
* **Fault Tolerance** — Retries and the Dead Letter Queue prevent transient failures from causing data loss.
* **Maintainability** — Clear separation of concerns makes the codebase easier to understand, test, and evolve.

---

# Summary

The daemon is built as a collection of focused components that work together to provide reliable asynchronous job processing. Each component owns a specific responsibility, allowing the system to remain modular, resilient, and straightforward to extend as new job types and capabilities are introduced.
