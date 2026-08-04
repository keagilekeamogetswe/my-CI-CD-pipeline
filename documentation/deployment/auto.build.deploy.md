# Deployment Autoloader

## Overview

The Deployment Autoloader automates the discovery, build, and deployment of every deployable microservice within the project.

Instead of maintaining a hard-coded list of services, the autoloader scans the `micro-services/` directory using predefined filename patterns to discover deployment descriptors (`*.skaffold.yaml`). Every discovered descriptor represents a deployable service.

After discovery, the autoloader delegates the remaining work to two helper scripts located in `micro-services/utilities/`:

* **build.sh** — Builds the container image for the discovered service.
* **deploy.sh** — Deploys the previously built image into the Kubernetes cluster.

Neither script assumes a fixed working directory. Before executing any Skaffold command, they determine the owning service, switch the current shell context into that service's directory, execute the command, and then return control to the autoloader.

This architecture allows every service to share a common deployment pipeline while remaining completely independent.

---

# Project Structure

```text
ROOT
│
└── micro-services
    │
    ├── service-a/
    │   ├── npm/
    │   ├── Dockerfile
    │   └── test/
    │
    ├── proto/
    │   ├── daemon.proto
    │   └── ...
    │
    ├── utilities
    │   └── JwtHelper.js
    │   └── autoloader.js # for deamon's registry which autoloads modules
    │   └── ...
    │
    ├── service-a.skaffold.yaml
    ├── service-b.skaffold.yaml
    └── ...
├── autoloader.sh
├── build.sh
├── deploy.sh
```

> **Note**
>
> `service` is a placeholder representing any deployable microservice.
>
> Every deployment descriptor (`*.skaffold.yaml`) resides directly under the `micro-services/` directory, making discovery straightforward while keeping deployment metadata separate from service source code.

---

# Directory Responsibilities

| Directory         | Responsibility                                                                      |
| ----------------- | ----------------------------------------------------------------------------------- |
| `service-*`       | Individual microservice source code.                                                |
| `proto/`          | Shared Protocol Buffer definitions used by the gRPC server and clients.             |
| `utilities/`      | Shared deployment utilities including the Deployment Autoloader and helper scripts. |
| `*.skaffold.yaml` | Deployment descriptors discovered automatically by the Deployment Autoloader.       |

---

# Deployment Workflow

```text
                     ┌─────────────────────────────┐
                     │ Deployment Autoloader       │
                     │ Loop over search patterns   │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                     Find *.skaffold.yaml files
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ▼                     ▼
              service-a.skaffold.yaml   service-b.skaffold.yaml
                         │                     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                        Determine owning service
                                    │
                                    ▼
                       Check current working context
                                    │
                                    ▼
                          utilities/build.sh
                                    │
                                    ▼
                         cd service directory
                                    │
                                    ▼
                            skaffold build
                                    │
                                    ▼
                         utilities/deploy.sh
                                    │
                                    ▼
                         cd service directory
                                    │
                                    ▼
                           skaffold deploy
                                    │
                                    ▼
                       Continue until all deployment
                      descriptors have been processed.
```

---

# Build Script

The build script is responsible for producing container images.

For every discovered deployment descriptor it:

1. Determines which service owns the descriptor.
2. Changes the current working directory into that service.
3. Executes `skaffold build`.
4. Returns control to the Deployment Autoloader.

Because the working directory changes dynamically, a single build script can build every service in the repository.

---

# Deploy Script

The deploy script performs deployment after a successful build.

For every service it:

1. Determines the owning service.
2. Changes into the service directory.
3. Executes `skaffold deploy`.
4. Returns control to the Deployment Autoloader.

Using the same context-switching strategy for both scripts guarantees a consistent deployment workflow across every service.

---

# Side Effects of Folder Structure Changes

The Deployment Autoloader relies on the project's directory layout.

Changes to the structure may require updating:

* Search patterns used during discovery.
* Service resolution logic.
* Build context resolution.
* Deployment context resolution.
* Helper script navigation.

Maintaining a consistent directory structure ensures that services continue to be discovered automatically.

---

# Design Goals

The Deployment Autoloader was designed around the following principles:

* Automatic service discovery.
* Convention over configuration.
* Zero manual service registration.
* Shared deployment pipeline.
* Independent service ownership.
* Reusable deployment utilities.
* Scalable project organization.

---

# Benefits

This architecture provides several advantages:

* New services require only a new service directory and deployment descriptor.
* Deployment logic exists in one place.
* Build and deployment scripts are shared across all services.
* Every service remains self-contained.
* The deployment workflow scales naturally as additional services are introduced.

---

# Summary

The Deployment Autoloader removes the need for manually maintaining deployment lists. It discovers deployment descriptors directly from the `micro-services/` directory, resolves the corresponding service, delegates building and deployment to reusable helper scripts, and processes every discovered service automatically. This approach provides a consistent, scalable, and low-maintenance deployment workflow while keeping deployment tooling separate from application code.
