# Skills as Apps

**Turn portable Agent Skills into local software.**

A `SKILL.md` packages a way of doing work. Skills as Apps gives that portable skill a local model, explicit capabilities, permission boundaries, and its own execution loop without rewriting the skill for this runtime.

```text
SKILL.md
   + local model
   + permissioned capabilities
   + execution
   = running local software
```

The skill stays portable. The work stays on your computer.

## Status

Pre-v0.1. The first vertical proof is intentionally narrow.

- **Milestone 1 — done:** discover and inspect a portable `SKILL.md`, including the standard `skills/<name>/SKILL.md` repo layout used by [`open-loops`](https://github.com/hnshah/open-loops).
- **Milestone 2 — done in code:** execute the skill with an Ollama model through Skills as Apps' own model/tool loop. The adapter is covered by a local mock-protocol integration test; a real Ollama model is the machine-level smoke test.
- **Milestone 3 — done:** expose read-only filesystem operations only inside explicitly approved roots and deny reads outside them.
- **Milestone 4 — done:** persist inspectable local run records, model/tool events, results, failures, skill hashes, and permission scope.

No durable skill state, schedules, persistent grants, marketplace, desktop UI, or multi-agent orchestration yet.

## Why this exists

Agent Skills are portable expertise. They describe how a capable agent should perform a class of work. But the skill itself does not decide which local model to use, which machine resources it may touch, how permission boundaries are enforced, where state lives, or how the work gets executed repeatedly.

Skills as Apps owns that missing runtime layer.

The project is testing a specific idea:

> **A skill should be able to become software without being rewritten as software.**

## First proof — Open Loops

[`open-loops`](https://github.com/hnshah/open-loops) is the integration target from the first commit because it is a real portable Agent Skill, not a runner-specific demo. Its repository uses the standard flat `skills/open-loops/SKILL.md` layout and its method depends on evidence, closure detection, and constrained source access.

Clone both repos beside each other, then:

```bash
npm run build
node dist/src/cli/main.js inspect ../open-loops
```

The runtime should discover `../open-loops/skills/open-loops/SKILL.md` without any change to Open Loops.

To run it with a local Ollama model against a controlled folder:

```bash
node dist/src/cli/main.js run ../open-loops \
  --model qwen3:8b \
  --allow-read ./fixtures/open-loops \
  --objective "Find the important open loops in the authorized fixture. Search for closure before surfacing anything."
```

Every filesystem tool request is checked against the allowed roots. A model request for `/Users/...` or any other unapproved path is returned to the model as a denied tool result rather than executed.

## Commands

### Inspect

```bash
skills-as-apps inspect <skill-directory-or-repo>
# or
saa inspect <skill-directory-or-repo>
```

Outputs the skill identity, compatibility metadata, and discovered references/scripts/assets. Inspection grants nothing.

### Run

```bash
skills-as-apps run <skill-directory-or-repo> \
  --model <ollama-model> \
  --allow-read <approved-root> \
  --objective "..."
```

Multiple `--allow-read` flags are allowed. V0 grants are intentionally ephemeral for one invocation.

Every run is recorded locally under `~/.skills-as-apps/runs/` by default. Set `SKILLS_AS_APPS_HOME` to override the runtime data directory. Run records include model responses and tool results, so treat this directory as private local data.

### Runs

```bash
skills-as-apps runs
skills-as-apps inspect-run <run-id>
```

`inspect-run` returns the run identity, skill hash, model, objective, approved filesystem roots, timestamps, result or failure, and the ordered model/tool event stream.

## V0 architectural laws

1. **The skill stays standard.** No proprietary manifest is required to run a portable skill.
2. **Skills as Apps owns the execution loop.** Claude Code, Codex, OpenClaw, and other agent harnesses are not hidden runtime dependencies.
3. **Capabilities are not permissions.** The runtime may know how to read files while a run has permission to read none of them.
4. **No implicit access.** V0 exposes only user-approved read roots.
5. **The runtime knows skills, not domains.** There is no `openLoopCandidate()` in core. The runtime understands skills, resources, models, tools, grants, and runs.
6. **Local means architectural local.** The default model endpoint is `127.0.0.1`; source files are read locally and are not sent to a cloud service by this runtime.

See [`docs/adr`](docs/adr/) for the decisions.

## Current architecture

```text
portable skill
    ↓
skill discovery + loader
    ↓
context assembly
    ↓
local model adapter (Ollama)
    ↕
permissioned capability tools
    ↓
result
```

The next milestones add durable skill state, persistent grants, eval execution, and GitHub installation in that order.

## Development

Requires Node 22+ and TypeScript 5.8+.

```bash
npm run build
npm test
```

The test suite verifies portable skill discovery, progressive skill-resource loading, the local model/tool loop, allowed and denied filesystem access, Ollama protocol wiring, and local run persistence.

CI also clones the current public Open Loops repository and proves that it is discoverable unchanged.

## Competitive boundary

Skills as Apps is deliberately not:

- a skill installer or registry
- a wrapper around existing agent CLIs
- a skill compiler/optimizer across harnesses
- passive runtime observability
- a hosted web-app wrapper
- another skill format

Those are useful neighboring layers. This project exists to make an unchanged portable skill behave like user-owned local software.

## License

MIT
