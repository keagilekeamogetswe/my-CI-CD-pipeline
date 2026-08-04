# Action Autoloader

## Overview

The Action Autoloader is responsible for automatically discovering, loading, and registering all job actions during daemon startup.

Instead of manually importing every action into the application, the autoloader scans the configured actions directory, dynamically imports every valid action module, validates its structure, and registers it in a central action registry.

This allows the daemon to execute jobs based solely on their job type without requiring changes to the core processing logic whenever a new action is introduced.

---

# Why an Autoloader?

Without an autoloader, every new action would require changes to the daemon:

* Import the new action.
* Register it manually.
* Update a switch statement or routing logic.

As the number of actions grows, maintaining this approach becomes error-prone.

The autoloader eliminates this problem by discovering actions automatically at startup.

---

# How It Works

When the daemon starts:

1. The autoloader scans the configured `actions/` directory.
2. Every JavaScript module is dynamically imported.
3. Each module is validated to ensure it exports the required metadata.
4. Valid actions are registered in the Action Registry.
5. The daemon starts processing jobs.

Once startup is complete, the daemon can resolve any job by looking up its registered action.

```
Daemon Startup
      │
      ▼
Scan actions directory
      │
      ▼
Import action modules
      │
      ▼
Validate action exports
      │
      ▼
Register actions
      │
      ▼
Daemon Ready
```

---

# Job Execution Flow

When a job is received:

1. The processor reads the job type.
2. The Action Registry searches for a matching action.
3. The registered handler is executed.
4. The handler processes the payload.
5. The processor updates the job status.

```
Job Queue
    │
    ▼
Read Job Type
    │
    ▼
Action Registry
    │
    ▼
Registered Action
    │
    ▼
Execute Handler
    │
    ▼
Update Job Status
```

---

# Example

A job stored in the queue:

```json
{
  "type": "session.save",
  "payload": {
    "user_id": 1,
    "jti": "abc123"
  }
}
```

If an action has registered itself using:

```text
session.save
```

the daemon automatically executes that action without any additional configuration.

---

# Action Registration

Every action exposes metadata describing itself.

Typical information includes:

* Action identifier
* Handler function
* Retry policy
* Validation requirements
* Additional execution metadata

During startup the autoloader validates this metadata before registration.

Invalid actions are rejected, preventing runtime failures.

---

# Benefits

* Zero manual registration.
* Modular architecture.
* Easily extensible.
* Cleaner daemon startup.
* Eliminates large switch statements.
* Encourages feature isolation.
* Reduces maintenance overhead.

---

# Adding a New Action

To add support for a new job type:

1. Create a new action module inside the `actions/` directory.
2. Export the required metadata and handler.
3. Restart the daemon.

No additional registration code is required.

---

# Design Goals

The Action Autoloader was designed around the following principles:

* Convention over configuration.
* Automatic discovery.
* Strong validation.
* Separation of concerns.
* High extensibility.
* Minimal boilerplate.

---

# Responsibilities

The autoloader is responsible for:

* Discovering action modules.
* Dynamically importing modules.
* Validating exported metadata.
* Registering actions.
* Preventing duplicate registrations.
* Reporting startup errors.
* Preparing the daemon for job execution.

It is **not** responsible for executing jobs, retrying failed jobs, or interacting with the queue. Those responsibilities belong to the job processor.

---

# Architecture

```
               ┌─────────────────────┐
               │    Daemon Startup   │
               └──────────┬──────────┘
                          │
                          ▼
                Action Autoloader
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     Discover        Import Modules     Validate
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                 Action Registry
                          │
                          ▼
                  Job Processor
                          │
                          ▼
                  Execute Action
```

---

# Summary

The Action Autoloader provides a plug-in architecture for the daemon. By automatically discovering and registering actions at startup, it allows new job types to be introduced without modifying the daemon's core logic. This results in a scalable, maintainable, and extensible job processing system that grows naturally as new functionality is added.
       ┌────────────────────────────────────────────────────────┐
       │                    DAEMON STARTUP                      │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                        ACTION AUTOLOADER                          │
 │  1. Directory Scan ➔ 2. Dynamic Import ➔ 3. Metadata Validation  │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │ Valid Modules Only
                                   ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                         ACTION REGISTRY                           │
 │             Map<JobType, { handler, retryPolicy, ... }>           │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
                                   ▼
 ┌───────────────────────────────────────────────────────────────────┐
 │                       RUN-TIME JOB EXECUTION                      │
 │      RabbitMQ Job ➔ Registry Lookup ➔ Execute Handler ➔ Ack     │
 └───────────────────────────────────────────────────────────────────┘