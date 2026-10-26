# LazyStack 1.0.4 release scope and QA record

## Included in v1.0.4

- Unified workspace on/off setting; native language projects retain their own files and commands.
- FastAPI API-service profile with CRUD, persistence, migrations, bearer-token authentication, OpenAPI documentation, and tests.
- Typed TypeScript client generation from connected OpenAPI contracts.
- Service dependency and network topology diagrams in the inspector and generated architecture documentation, with SVG and Markdown export.
- Expanded generated-project CI for representative JavaScript/TypeScript, Python, Go, Rust, Java, Kotlin, and PHP projects.
- Updated documentation and generated-project setup guidance.

## QA status

The generated-project CI workflow passed for source commit `74346f4`; release metadata and documentation were updated afterward. Local build, TypeScript, generated FastAPI, Go, Rust, PHP, Compose, and OpenAPI client checks were also run during implementation. Release packages target Linux AppImage and Windows portable EXE only.

## Deferred to v1.0.5

The following were identified during v1.0.4 planning and moved to the next release: gRPC/protobuf contracts, event schemas and broker wiring, explicit service-to-service authentication, an opt-in observability profile, and broader framework starter coverage. They are not advertised as v1.0.4 capabilities.
