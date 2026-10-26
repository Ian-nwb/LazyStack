# LazyStack 1.0.5 roadmap

This roadmap carries forward features deferred from v1.0.4. These are planned capabilities, not features in v1.0.4.

## Service contracts and messaging

- Add protobuf contract selection, generated gRPC server/client stubs, health/reflection configuration where supported, and Compose dependencies.
- Add event schema definitions and compatibility validation; connect selected producers and consumers to a chosen broker with generated topic/queue names and credentials.
- Represent contract ownership, protocol, consumer, and generated output paths in the blueprint so diagrams and CI use the same data.
- Validate contract changes in CI and build an end-to-end sample that passes a request/event between generated services.

## Service-to-service authentication

- Add explicit blueprint choices for service credentials and supported authentication patterns.
- Generate secrets only into ignored environment files, document rotation and local development setup, and avoid committing usable credentials.
- Test allowed and rejected calls between generated services. Clearly label unsupported frameworks instead of generating partial security wiring.

## Observability

- Add an opt-in profile with OpenTelemetry SDK/exporter wiring for supported templates, a collector, Prometheus scraping, Grafana dashboards, and a documented log collection path.
- Make ports, credentials, retention, resource limits, and exposed versus internal services configurable.
- Provide starter dashboards for health, latency, request/error counts, and resource usage. Document unsupported language exporters.
- Validate Compose, boot, trace and metrics delivery, dashboard provisioning, and shutdown with the profile enabled and disabled.

## Generated-project quality and coverage

- Expand starter coverage and feature parity across the framework catalog only as generated-project CI proves install, build, tests, and runtime behavior.
- Keep native build tools and project conventions for Python, Go, Rust, Java/Kotlin, PHP, and other non-JavaScript apps.
- Report generated-project failures by language and identify the failing install/build/test/boot step.

## Release gates

- Do not advertise gRPC, event contracts, service authentication, or observability until a representative end-to-end blueprint passes CI.
- Keep unsupported framework/feature combinations explicit in the UI and generated documentation.
- Continue producing Linux and Windows packages only unless macOS support is requested separately.
