# ADR 003 — Capabilities and permissions are different layers

Status: accepted

A capability describes what the runtime can make possible. A permission grant describes what a particular run is allowed to access.

For example, the runtime capability `filesystem.read` may expose primitive tools such as `filesystem_list`, `filesystem_read`, and `filesystem_stat`. None of those tools can access a path until the user supplies an approved root.

V0 uses ephemeral `--allow-read` roots. Persistent grants belong to a later milestone.
