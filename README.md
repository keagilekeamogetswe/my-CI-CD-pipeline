# Development Philosophy & Contributor Guide

Our codebase relies on automated orchestration via `autoload.sh`, Skaffold, and Kubernetes. To maintain build speed, pipeline compatibility, and test stability across our microservices architecture, every contributor must follow these core principles.

---

## 1. Pipeline Alignment & Directory Conventions

The root `autoload.sh` script (and its backing `build.sh` / `deploy.sh` tools) relies strictly on explicit file path patterns to discover and deploy services. Deviating from these paths breaks automated pipelines.

* **Strict Path Conventions:** Every new microservice or infrastructure bundle must fit into one of our three recognized structural patterns:
  * **Service Manifests:** `microservices/<service-name>.skaffold.yaml`
  * **Infrastructure Bundles:** `k8s-bundle/<bundle-name>/skaffold.yaml`
  * **Global Cluster Orchestration:** `kubernetes/skaffold.yaml`
* **Reference Example (`microservices/busybox`):**
  * Use `microservices/busybox` and its accompanying configuration file `microservices/busybox.skaffold.yaml` as the blueprint for creating new microservices.
  * When adding a new service, replicate the structure and configuration design pattern established in the `busybox` example.
* **Zero Configuration Drift:** Do not place Skaffold manifests in arbitrary folders. If `autoload.sh` cannot find your configuration pattern, your service will be omitted from the build and deployment lifecycle.
* **Standardized Service Naming:** Service directories, image names, and Kubernetes metadata must share identical `kebab-case` naming (e.g., `busybox`, `daemon-worker`, `auth-service`).

---

## 2. Infrastructure & State Management

Our system relies on dedicated operators, asynchronous messaging, and containerized state managers. Contributors must respect boundaries between stateful services and stateless app logic:

* **Database Migrations via Flyway Jobs:** Schema changes must never be embedded in application startup logic. All migrations must be written as Flyway scripts executed via dedicated Kubernetes `Job` resources.
* **Operator Compliance:** MySQL interactions must accommodate the MySQL Operator setup (primary elections and read replication). Do not write raw connection logic that assumes a single static database instance.
* **Asynchronous Message Queuing:** Long-running background processes (like the daemon worker) must communicate strictly through the dedicated RabbitMQ service rather than synchronous inter-service HTTP calls.

---

## 3. Testing Philosophy & Test Environment Hygiene

To prevent resource contention, flaky builds, and lingering state corruption in CI/CD, integration testing follows strict isolation rules:

* **Shared Test Environment Alignment:** Local and CI integration tests run inside the unified Docker Compose environment (provisioning RabbitMQ, MySQL, Flyway, and Mailpit). Never point integration tests directly at production or local bare-metal environments.
* **Sequential Test Execution:** Integration tests run strictly sequentially (one test suite at a time). **Do not introduce parallel test execution flags**, as concurrent runs create state conflicts over shared infrastructure like RabbitMQ queues and MySQL tables.
* **Process Cleanup & Teardown:** Test files must explicitly close database handles, flush mock queues, and terminate background workers upon completion to prevent lingering child processes from breaking subsequent test runs.
