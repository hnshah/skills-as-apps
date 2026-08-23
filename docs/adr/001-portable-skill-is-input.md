# ADR 001 — The portable skill is input

Status: accepted

Skills as Apps consumes existing Agent Skill packages. A compatible skill must not need a Skills as Apps manifest or source edit merely to run.

Runtime-specific model choice, permissions, schedules, state, and execution metadata live outside the portable skill.

The conformance question is deliberately binary: can an unmodified third-party skill be discovered, granted an explicit local capability, executed, and inspected?
