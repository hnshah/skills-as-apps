# Skills as Apps — Product and Build Brief

## Decision

**Name:** Skills as Apps  
**Repository:** `skills-as-apps`  
**Category:** local application runtime for portable Agent Skills  
**Initial platform:** macOS  
**Distribution:** open source  
**Initial interface:** CLI  
**First integration target:** [`hnshah/open-loops`](https://github.com/hnshah/open-loops)

## One sentence

**Turn portable Agent Skills into local software without rewriting the skill.**

## Product thesis

A portable Agent Skill packages method and judgment. It does not by itself provide a machine-local model, permission policy, execution loop, persistent state, scheduling, run history, artifacts, or evaluation.

Skills as Apps supplies the runtime layer while keeping those concerns outside the portable skill.

```text
SKILL.md
+
MODEL
+
CAPABILITIES
+
PERMISSIONS
+
CONTEXT
+
STATE
+
EXECUTION
+
EVAL
=
SKILL APP
```

The term **skill app** is useful internally as the resulting bound object. The portable skill remains the source artifact. The runtime binding is local and revocable.

## The wedge

The ecosystem already contains skill distribution, host translation, agent-CLI wrappers, cross-harness compilers, observability layers, registries, and hosted skill-to-web-app products.

The wedge here is narrower:

> **An unchanged portable skill becomes private software on the user's own machine without requiring a host-agent product.**

The project should never claim to have invented the idea that skills resemble apps. It should make that analogy literal in a specific way that users can test.

## Product laws

### 1. Portability is upstream

A basic third-party skill must run without a Skills as Apps manifest or source edit. Runtime-specific configuration belongs outside the skill.

### 2. The runtime owns execution

The model loop, context assembly, capability exposure, permission checks, run lifecycle, state, artifacts, and evals belong to Skills as Apps. Existing agent CLIs are not the hidden executor.

### 3. Capabilities and grants are separate

`filesystem.read` is a capability class. A grant specifies the approved roots for a particular skill/run. Primitive tools such as list/read/stat execute only inside those roots.

### 4. No domain logic in core

Core understands `skill`, `resource`, `model`, `capability`, `grant`, `run`, `artifact`, `state`, `evaluation`, and `schedule`. It does not understand Open Loops, competitors, decks, diagrams, or any other skill's subject matter.

### 5. Local-first is a trust boundary

No source data leaves the computer unless the user explicitly configures a networked capability or remote model later. V0 defaults to loopback model endpoints and local filesystem scope.

### 6. Evals before auto-routing

Model selection remains explicit until repeatable per-skill eval evidence exists. `--model auto` is earned, not guessed.

## First vertical proof

Open Loops is the first integration target because it is already a real portable skill with an independently useful job. It owns the ontology, evidence rules, completion detection, ranking, and output contract. Skills as Apps owns none of that.

Open Loops' core technical idea is state reconstruction: identify a possible obligation, then search later evidence to determine whether it closed, changed, moved, or remains unresolved. That makes it a strong runtime stress test for source scope and tool-mediated evidence access.

### Fixture

The first controlled dataset contains:

- explicit unresolved commitments
- completed commitments
- a delegated item
- ambiguous social language
- upcoming preparation
- a denied file outside the approved root

### Runtime acceptance

The initial proof passes when:

1. Skills as Apps discovers Open Loops from the repository root without modifying the repo.
2. It parses the skill identity and discovers references progressively.
3. It calls one locally hosted model through its own adapter.
4. It exposes filesystem operations as model tools.
5. The user explicitly scopes readable roots.
6. Reads inside the root succeed.
7. Reads outside the root fail closed and the model receives the denial as a tool result.
8. The output is produced by the Open Loops procedure, not hard-coded runtime logic.

The Open Loops quality benchmark remains a separate failure domain from runtime conformance.

## Build sequence

### Milestone 0 — Naming and project boundary

Done.

- `Skills as Apps`
- `skills-as-apps`
- hero: **Turn portable Agent Skills into local software.**
- core claim: **A skill should be able to become software without being rewritten as software.**

### Milestone 1 — Inspect a portable skill

Done.

```bash
skills-as-apps inspect ../open-loops
```

Requirements:

- accept a direct skill directory, a `SKILL.md`, or a repo containing exactly one `skills/<name>/SKILL.md`
- require `name` and `description`
- discover `references/`, `scripts/`, and `assets/`
- do not eagerly load resource contents for inspection
- grant no external capabilities

### Milestone 2 — Give the skill a local model

Done in code against Ollama's local `/api/chat` protocol.

```bash
skills-as-apps run ../open-loops --model qwen3:8b
```

Requirements:

- Skills as Apps assembles the system context
- Skills as Apps calls the local model directly
- no Claude/Codex/OpenClaw subprocess is involved
- tool calls remain inside the same run loop
- V0 model selection is explicit

### Milestone 3 — Give the skill read-only hands

Done.

```bash
skills-as-apps run ../open-loops \
  --model qwen3:8b \
  --allow-read ./fixtures/open-loops
```

V0 external tools:

```text
filesystem_list
filesystem_read
filesystem_stat
```

Permission class:

```text
filesystem.read
```

The CLI uses ephemeral grants until persistent permission storage is built. Skill-owned references and scripts are loaded progressively through the separate `skill_resource_read` runtime tool and do not widen external filesystem scope.

### Milestone 4 — Persist an inspectable run

Done.

Every invocation now receives a run id and writes a private local record under `~/.skills-as-apps/runs/<id>/` by default. The root can be changed with `SKILLS_AS_APPS_HOME`.

Persisted data includes:

```text
run id
skill identity + exact SKILL.md sha256
model id
objective
approved filesystem roots
ordered model/tool event log
model responses
capability results
timestamps
turn count
result
failure state
```

CLI:

```bash
skills-as-apps runs
skills-as-apps inspect-run <id>
```

`events.jsonl` deliberately records tool results and model output for inspectability. It may therefore contain source data from approved local files and must be treated as private local runtime data.

### Milestone 5 — Persist skill state

Next.

Use SQLite plus an artifact filesystem. Keep durable state structured and distinct from free-form memory. A skill should be able to resume useful local work without the runtime learning domain-specific semantics.

### Milestone 6 — Persistent permission grants

Add `grant`, `revoke`, and `permissions`. Preserve read/write/execute/network separation.

### Milestone 7 — Eval execution

Run skill fixtures and record model/task/pass/latency. Only after this exists should automatic model routing be designed.

### Milestone 8 — GitHub installation

Install from a source repository with provenance and a pinned revision. Generic ecosystem installation already exists elsewhere, so this is intentionally later than execution.

## What V0 excludes

- desktop UI
- cloud service
- marketplace
- MCP as architecture
- email/calendar adapters
- persistent scheduler
- generalized memory
- multi-agent orchestration
- model compiler/optimizer
- WASM packaging
- proprietary skill manifest
- hidden agent CLI execution
- automatic model selection

## Initial success metric

Primary:

> **How many unmodified portable skills run successfully?**

Secondary once evals exist:

> **For a skill/model pair, what percentage of representative evals pass?**

Do not optimize for supported-model count or supported-skill count before conformance is real.

## Public proof strategy

The README should prove the project before explaining the architecture.

The smallest wow is:

```text
open-loops/skills/open-loops/SKILL.md
             ↓
Skills as Apps
             ↓
Open Loops running on a local model
with one explicitly approved folder
and nothing else
```

The first public demo should visibly show:

- unchanged upstream skill path
- local model name
- approved filesystem scope
- one denied access attempt or permission boundary test
- evidence-backed output
- the resulting inspectable run record
- zero cloud source-data dependency

## Launch language

Do not lead with “runtime,” “VM,” “OS,” “engine,” or “agent framework.” Those words place the project in crowded infrastructure comparison sets.

Lead with the consequence:

> **Turn portable Agent Skills into local software.**

Supporting explanation:

> Everyone keeps describing Agent Skills as apps for agents. Skills as Apps tests the literal version: give an unchanged `SKILL.md` a local model, explicit permissions, state, and its own execution loop so a person can run it as software on their computer.

## Immediate next work

1. Run the real Open Loops smoke test against an installed local Ollama model and capture the full inspectable transcript.
2. Turn every real runtime failure into a conformance test.
3. Implement Milestone 5 structured durable state.
4. Expand the compatibility corpus beyond Open Loops only after the first real local run is solid.
