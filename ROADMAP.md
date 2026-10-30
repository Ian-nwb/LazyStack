# LazyStack Roadmap: Next Priorities

This roadmap documents the two core priorities selected for upcoming LazyStack releases.

---

## 1. Unified Dev Orchestrator (`lazystack dev` / `npm run dev:all`)

### The Problem
Currently, running a polyglot monorepo requires either running full Docker container builds for every code edit or manually opening 4–5 separate terminal tabs to run each frontend, API service, and background worker on the host machine.

### The Solution
Generate a unified root development orchestration script (`npm run dev:all` / `lazystack dev`) in every scaffolded project:
1. **Automated Database & Infrastructure Boot**: Automatically spins up required background databases, caches, and proxies via `docker compose up -d`.
2. **Concurrent Host Runners with Colored Prefixes**: Runs host applications concurrently with live colored terminal prefixes (e.g., `[web]`, `[api]`, `[worker]`), multiplexing stdout/stderr into a single interactive terminal window.
3. **Dynamic Environment Variable Injection**: Loads and injects mutual inter-service configuration and credentials dynamically from the generated root `.env` into each child process.
4. **Graceful Teardown**: Intercepts `SIGINT` / `SIGTERM` / `Ctrl+C` to cleanly terminate all child processes and optionally prompt to stop background Docker containers.

---

## 2. Event-Driven Message Brokers & Worker Wiring (RabbitMQ, Kafka, Redis Streams)

### The Problem
While message brokers like RabbitMQ and Redis are available in the catalog, scaffolded microservices lack pre-wired event publishers, subscriber listeners, and typed message schemas out of the box. Developers still have to write boilerplate connection pooling, channel lifecycle, serialization, and retry logic from scratch.

### The Solution
Add full event-driven architectural wiring when a message broker is included in a stack:
1. **Producer & Consumer Starters**:
   - **Go**: High-throughput consumer/publisher worker with automatic reconnection logic.
   - **Python**: Async event consumer (using Celery, RQ, or native `aio-pika` / `redis-py`).
   - **Node.js / TypeScript**: Type-safe AMQP / Redis Streams event worker.
2. **Shared Event Schemas (`packages/events/`)**:
   - Generate a shared event schema module with strongly typed event definitions and JSON / Protobuf payload types shared across publishers and subscribers.
3. **Dead-Letter Exchanges & Retry Policies**:
   - Pre-configured retry mechanisms, exponential backoff, and dead-letter queue (DLQ) topology in the broker container configuration.
