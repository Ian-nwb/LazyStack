# LazyStack Small Language Model Assistant Guide

This guide is a learning path and implementation reference for a planned LazyStack assistant. The goal is to let a user describe a stack in plain language—such as “create a MERN-style app, use PostgreSQL instead of MongoDB, and run the API as a separate service”—and have the app produce a validated, reviewable blueprint before scaffolding.

## What the feature needs to do

1. Accept a natural-language request and ask follow-up questions when key choices are missing.
2. Convert the request into LazyStack's existing project settings: applications, framework IDs, database instances, proxy, ports, and folder-structure configuration.
3. Validate every model-generated field against LazyStack's supported catalogs and schemas.
4. Show a human-readable plan and blueprint diff. Generate files only after the user approves.
5. Run locally by default, show model/runtime status, and keep ordinary manual configuration usable without an installed model.

For the example request, the assistant might choose React + Express, PostgreSQL, and separate frontend/backend services. “MERN” conventionally includes MongoDB, so the explicit PostgreSQL instruction should override that default and be reflected in the review summary.

## The moving parts

- **Model**: a compact instruction-tuned language model that interprets requests and emits structured JSON. Parameter count is only one factor; instruction following, supported languages, context length, tool-call behavior, quantization, and license matter too.
- **Inference runtime**: loads model weights and exposes generation, typically on localhost. Ollama is the simplest first integration; llama.cpp is a useful alternative for GGUF models and lower-level control.
- **Assistant orchestration**: sends the conversation and a constrained schema to the model, parses the response, handles clarification turns, and requests corrections when output is invalid.
- **LazyStack tools**: deterministic application functions such as `list_supported_frameworks`, `list_databases`, `validate_blueprint`, and `scaffold_approved_blueprint`. Model output proposes tool calls; application code validates and executes them.
- **Optional retrieval**: local docs/search over LazyStack's framework catalog and template guidance can ground answers. Start with curated text and exact catalog data; add embeddings/vector search only if measured needs justify it.

An SLM does not itself scaffold projects. It predicts text or structured output. LazyStack's code interprets that output, enforces the schema and policy, asks the user for approval, and performs the operation.

## Suggested first implementation

1. Add an opt-in **AI Assistant** panel and a provider settings page (runtime URL, model name, connection check).
2. Begin with Ollama's local HTTP API and an instruction model whose model card documents structured output or tool calling. Keep provider access behind a small interface so llama.cpp can be added later.
3. Define a versioned JSON Schema for a blueprint proposal. Use the current LazyStack types/catalog as the source of truth, not free-form model-generated framework names.
4. Send the user's request, relevant supported options, and schema to the model. Ask it for a proposal or a clarification question; don't ask it to emit files or shell commands.
5. Validate parsed JSON in application code. Reject unknown IDs, invalid ports/paths, and unsupported combinations. If invalid, return a bounded validation error for one repair attempt, then show a useful error.
6. Render a summary and field-level diff. Require the user to approve before calling the existing scaffolder.
7. Test with a small set of representative prompts, including conflicting constraints, unsupported frameworks, vague requests, malformed output, unavailable runtime, and malicious instructions embedded in project text.
8. Measure latency, memory use, valid-blueprint rate, and clarification rate on supported hardware before selecting a default model.

### Tool/API boundary

Expose narrow application tools, not a general shell. A safe first set could be:

```text
get_supported_options() -> framework IDs, database IDs, proxies, architecture presets
validate_blueprint(proposal) -> validation errors or normalized proposal
scaffold_approved_blueprint(proposal, userApproved: true) -> scaffold result
```

The UI must retain the approval step. The model must not choose arbitrary output paths, execute arbitrary commands, or bypass existing path validation. Treat project files, imported blueprints, and retrieved documentation as untrusted input.

## Local runtime quick start: Ollama

Install Ollama using its [official download and setup instructions](https://ollama.com/download), then pull a model supported by the user's machine. Model names and requirements change, so check the model page before recommending a default.

```bash
ollama pull qwen3:4b
ollama serve
```

Ollama's local API normally listens at `http://localhost:11434`. Confirm the model is available:

```bash
curl http://localhost:11434/api/tags
```

Minimal chat request using the native API:

```bash
curl http://localhost:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen3:4b",
    "stream": false,
    "messages": [
      {"role": "system", "content": "Return a concise JSON blueprint proposal."},
      {"role": "user", "content": "Create a React and Express app with PostgreSQL, API as a separate service."}
    ],
    "format": "json"
  }'
```

The example illustrates the request shape; a production integration should pass a JSON Schema where supported, validate the result locally, handle errors/timeouts, and use the exact model's documented template and tool-call capabilities. In an Electron app, keep model calls in the main process or a controlled local service rather than exposing broad filesystem or process access to renderer code.

Ollama also documents an OpenAI-compatible API at `http://localhost:11434/v1`. Compatibility is a subset and varies by endpoint/model, so test the specific features used. llama.cpp's `llama-server` also exposes OpenAI-compatible endpoints; consult its server docs for model-specific launch flags and tool-call templates.

## Books, papers, courses, and videos

### Books and free book materials

- [Build a Large Language Model (From Scratch), Sebastian Raschka](https://www.manning.com/books/build-a-large-language-model-from-scratch): practical walkthrough of tokenization, attention, transformer blocks, pretraining, and instruction fine-tuning. The [author's code repository](https://github.com/rasbt/LLMs-from-scratch) contains notebooks and supporting materials.
- [Speech and Language Processing, Jurafsky & Martin (draft)](https://web.stanford.edu/~jurafsky/slp3/): broad textbook covering language modeling and modern NLP; use the current online draft.
- [The Little Book of Deep Learning, François Fleuret](https://fleuret.org/public/lbdl.pdf): concise mathematical introduction to neural networks and deep learning foundations.

### Papers and model background

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762): original Transformer architecture paper.
- [Training Compute-Optimal Large Language Models (Chinchilla)](https://arxiv.org/abs/2203.15556): scaling training data and model size.
- [Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531): foundational knowledge-distillation paper.
- [SmolLM model family and reports](https://github.com/huggingface/smollm): examples of compact open models and training details.

### Documentation and hands-on courses

- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course): Transformers, tokenizers, datasets, fine-tuning, and sharing models.
- [Hugging Face Agents Course](https://huggingface.co/learn/agents-course): tool use and agent loops, including how to build agents with smolagents.
- [Ollama API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md): local generate/chat endpoints, structured output, and request options.
- [Ollama OpenAI compatibility](https://github.com/ollama/ollama/blob/main/docs/api/openai-compatibility.mdx): endpoint and feature compatibility details.
- [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/tree/master/tools/server): launch options and OpenAI-compatible server endpoints.
- [Hugging Face Transformers documentation](https://huggingface.co/docs/transformers/index): loading, quantization, inference, and fine-tuning APIs.

### YouTube and video lectures

- [Andrej Karpathy: Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g): overview of how an LLM is trained and used.
- [Andrej Karpathy: Let's build GPT from scratch](https://www.youtube.com/watch?v=kCc8FmEb1nY): implementation-focused transformer walkthrough.
- [Andrej Karpathy: Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html): linked video course, including tokenization and language modeling from first principles.
- [Stanford CS25: Transformers United](https://www.youtube.com/@StanfordOnline): lecture series on Transformer models and applications.

## Further reading

- [Hugging Face SmolLM](https://huggingface.co/blog/smollm): compact model training and deployment overview.
- [OpenAI function calling guide](https://developers.openai.com/api/docs/guides/function-calling): a clear explanation of the application-controlled tool-call loop; the concepts transfer to local model providers.
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/): risks such as prompt injection and insecure tool execution.

## Model selection notes

Start with a few instruct models in the 1B–8B range, subject to device RAM/VRAM and license. Compare quantized and full-precision variants where the runtime supports them. Prefer a model that reliably follows the blueprint schema and handles the expected languages over one selected only because it is newer or larger. Keep model weights separate from LazyStack's installer unless redistribution rights and download size are deliberately addressed.

This is a research guide, not a promise that every linked model or API feature is supported by LazyStack yet. Confirm current model cards, licenses, runtime versions, and endpoint behavior before implementation.
