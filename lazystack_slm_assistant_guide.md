# LazyStack Small Language Model Assistant Guide

This guide provides a comprehensive architecture and implementation blueprint for integrating a local Small Language Model (SLM) assistant into **LazyStack**. 

Because LazyStack generates project boilerplates and provisions containerized database infrastructure, the SLM's primary responsibility is **deterministic intent translation and schema constraint enforcement**, rather than free-form text or code generation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    LAZYSTACK UI / CLI                                   │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                  1. Prompt Input Text
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                AI ASSISTANT ORCHESTRATOR                                │
│  ┌─────────────────────────────────┐           ┌──────────────────────────────────────┐  │
│  │   Catalog Grounding Injector    │           │     Strict System Prompt Engine      │  │
│  │ (LazyStack supported IDs/ports) │           │   (Enforces JSON Schema Output)     │  │
│  └────────────────┬────────────────┘           └──────────────────┬───────────────────┘  │
└───────────────────┼───────────────────────────────────────────────┼─────────────────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            │
                                2. Injected Prompt + Schema
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL INFERENCE RUNTIME (Ollama)                           │
│                       Model: Qwen2.5-Coder-3B / Llama-3.2-3B / DeepSeek-R1              │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                3. Raw JSON Output
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION VALIDATION LAYER                             │
│  ┌──────────────────────────────────┐         ┌──────────────────────────────────────┐  │
│  │      Schema & Type Checker       │         │      Port & Conflict Evaluator       │  │
│  │  (Zod / Valibot / JSON Schema)   │         │ (Checks local port/path collisions)  │  │
│  └────────────────┬─────────────────┘         └──────────────────┬───────────────────┘  │
└───────────────────┼──────────────────────────────────────────────┴──────────────────────┘
                    │
            4. Validated Proposal
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                HUMAN-IN-THE-LOOP (HITL)                                 │
│                            Diff Preview & User Approval UI                              │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                  5. Approved Execution
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              LAZYSTACK SCAFFOLDING ENGINE                               │
│                   Generates Codebases + Docker Compose Manifests                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Model Selection & Hardware Constraints

For developer workstations, the target model must run entirely in VRAM or RAM without interfering with Docker containers, IDEs, or localized database instances.

### Model Benchmarks for Blueprint Generation

| Model | Parameter Count | Quantization | RAM / VRAM Usage | Tool Call / JSON Reliability | Context Window | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen2.5-Coder-1.5B-Instruct** | 1.54B | Q4_K_M | ~1.2 GB | **High** | 32k | Ultra-lightweight CPU fallback; low-end dev laptops. |
| **Qwen2.5-Coder-3B-Instruct** | 3.09B | Q4_K_M / Q8_0 | ~2.2 GB - 3.6 GB | **Very High** | 32k | **Recommended Default.** Unmatched JSON schema adherence for size. |
| **Llama-3.2-3B-Instruct** | 3.21B | Q4_K_M | ~2.4 GB | **Moderate-High** | 128k | Good general instruction following and natural clarification turns. |
| **DeepSeek-R1-Distill-Qwen-1.5B** | 1.78B | Q4_K_M | ~1.4 GB | **Moderate** | 131k | Strong reasoning capabilities for complex or conflicting user prompts. |

---

## 2. Blueprint JSON Schema Specification

The SLM must output structured JSON matching LazyStack’s configuration specifications. Defining a strict schema prevents model hallucination of non-existent frameworks or invalid configurations.

```typescript
import { z } from 'zod';

export const SupportedFrameworks = z.enum([
  'react-ts',
  'vue-ts',
  'express-js',
  'express-ts',
  'nest-js',
  'go-fiber',
  'go-gin',
  'fastapi',
  'flutter',
]);

export const SupportedDatabases = z.enum([
  'postgresql',
  'mongodb',
  'mysql',
  'redis',
  'sqlite',
]);

export const SupportedProxies = z.enum(['nginx', 'caddy', 'none']);

export const ServiceBlueprintSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  framework: SupportedFrameworks,
  port: z.number().int().min(1024).max(65535),
  isPublic: z.boolean(),
});

export const DatabaseBlueprintSchema = z.object({
  type: SupportedDatabases,
  instanceName: z.string().regex(/^[a-z0-9-]+$/),
  port: z.number().int().min(1024).max(65535),
  volumeName: z.string(),
});

export const LazyStackBlueprintProposal = z.object({
  action: z.enum(['PROPOSE_BLUEPRINT', 'NEED_CLARIFICATION']),
  clarificationQuestion: z.string().optional(),
  projectName: z.string().regex(/^[a-z0-9-]+$/),
  architecture: z.enum(['monolith', 'modular_monolith', 'microservices']),
  services: z.array(ServiceBlueprintSchema),
  databases: z.array(DatabaseBlueprintSchema),
  proxy: SupportedProxies,
  dockerCompose: z.boolean(),
  reasoningSummary: z.string().max(300),
});

export type LazyStackBlueprint = z.infer<typeof LazyStackBlueprintProposal>;
```

---

## 3. System Prompt & Grounding Pipeline

To eliminate hallucinations, inject LazyStack’s active catalog directly into the system prompt context.

```typescript
export function buildSystemPrompt(supportedOptions: Record<string, unknown>): string {
  return `You are the LazyStack Architecture Assistant. Your task is to interpret user project requirements and convert them into a valid LazyStack JSON Blueprint Proposal.

STRICT CATALOG CONSTRAINTS (DO NOT DEVIATE):
- Supported Framework IDs: ${JSON.stringify(supportedOptions.frameworks)}
- Supported Database IDs: ${JSON.stringify(supportedOptions.databases)}
- Supported Proxy Options: ${JSON.stringify(supportedOptions.proxies)}

OPERATIONAL RULES:
1. If explicit instruction overrides a common stack default (e.g., "MERN stack but use PostgreSQL"), prioritize the explicit override (PostgreSQL).
2. If critical parameters are missing or ambiguous, set "action": "NEED_CLARIFICATION" and provide a concise "clarificationQuestion".
3. Assign unique, non-conflicting default ports (e.g., Express: 5000, React: 3000, PostgreSQL: 5432).
4. Output MUST be valid JSON conforming strictly to the provided schema. Do not output markdown code blocks or additional conversational text.`;
}
```

---

## 4. Orchestration & Validation Pipeline

The orchestration layer interfaces with the local Ollama instance, handles structured output enforcement, and runs self-correction loops when validation fails.

```typescript
import { LazyStackBlueprintProposal, type LazyStackBlueprint } from './schema';

export async function generateBlueprint(
  userPrompt: string,
  catalog: Record<string, unknown>,
  retryCount = 0
): Promise<LazyStackBlueprint> {
  const MAX_RETRIES = 2;

  const requestBody = {
    model: 'qwen2.5-coder:3b',
    stream: false,
    format: 'json',
    messages: [
      { role: 'system', content: buildSystemPrompt(catalog) },
      { role: 'user', content: userPrompt },
    ],
    options: {
      temperature: 0.1, // Low temperature for deterministic output
      num_ctx: 8192,
    },
  };

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Ollama runtime error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawContent = data.message.content;

  try {
    const parsedJson = JSON.parse(rawContent);
    
    // Validate against Zod schema
    const validatedBlueprint = LazyStackBlueprintProposal.parse(parsedJson);
    
    // Secondary business logic checks (Port collisions)
    validatePortCollisions(validatedBlueprint);

    return validatedBlueprint;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.warn(`Validation failed. Attempting repair iteration ${retryCount + 1}...`);
      
      // Self-Correction Loop: Feed error back to SLM
      const repairPrompt = `${userPrompt}\n\nYour previous response failed validation with error: ${error}. Please fix the JSON output.`;
      return generateBlueprint(repairPrompt, catalog, retryCount + 1);
    }
    throw new Error(`Failed to generate a valid blueprint after ${MAX_RETRIES} attempts: ${error}`);
  }
}

function validatePortCollisions(blueprint: LazyStackBlueprint): void {
  const ports = new Set<number>();
  
  for (const service of blueprint.services) {
    if (ports.has(service.port)) {
      throw new Error(`Port collision detected on port ${service.port} in service ${service.name}`);
    }
    ports.add(service.port);
  }
  
  for (const db of blueprint.databases) {
    if (ports.has(db.port)) {
      throw new Error(`Port collision detected on port ${db.port} in database ${db.instanceName}`);
    }
    ports.add(db.port);
  }
}
```

---

## 5. Security & Threat Mitigation

Deploying an AI assistant that interacts with file scaffolding introduces security risks that must be guarded against.

| Threat Vector | Risk Vulnerability | Mandatory Mitigation |
| :--- | :--- | :--- |
| **Prompt Injection** | User prompt contains text attempting shell execution or arbitrary file writes. | Sanitize inputs; enforce Zod schema parsing. Never pass raw strings to `exec()`. |
| **Path Traversal** | SLM generates service names like `../../etc/passwd`. | Strict regex enforcement `/^[a-z0-9-]+$/` on all path, service, and project names. |
| **Unauthorized Scaffolding** | SLM immediately executes disk-write routines. | Mandatory Human-in-the-Loop (HITL) manual user approval step before file generation. |

---

## 6. Implementation Roadmap

### Phase 1: Core Foundation & Provider Abstraction
- [x] Define Zod schemas for LazyStack configuration proposals.
- [x] Implement Provider Interface abstraction (`OllamaProvider`, `LlamaCppProvider`).
- [x] Build local runtime health check (`GET http://localhost:11434/api/tags`).

### Phase 2: Orchestration & Self-Correction Engine
- [x] Implement System Prompt builder with active catalog context injection.
- [x] Build multi-turn clarification state machine.
- [x] Construct single-attempt Repair Loop for JSON validation failures.

### Phase 3: Human-in-the-Loop UI Integrations
- [x] Design visual Diff Preview component (Proposed vs Current config).
- [x] Implement explicit User Confirmation trigger (`scaffold_approved_blueprint`).
- [x] Build fallback error states for missing/stopped SLM runtimes.