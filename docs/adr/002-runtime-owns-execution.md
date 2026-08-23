# ADR 002 — Skills as Apps owns execution

Status: accepted

The core runtime does not shell out to Claude Code, Codex, Gemini CLI, OpenClaw, or another agent harness as its primary execution mechanism.

Those systems may become optional integrations later. The V0 runtime itself assembles context, calls the configured local model, exposes capability tools, enforces permission boundaries, and controls the run loop.

This is the architectural distinction between an adapter and a standalone skill application runtime.
