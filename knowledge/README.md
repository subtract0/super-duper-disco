# knowledge/

This directory is the central knowledge base for agent swarms and LLMs. It is designed for both human and automated (agent/LLM) consumption, and organizes all protocols, project vision, logs, tasks, and historical data in a structured, cross-referenced, and machine-readable format.

## Structure

- `protocols/` — All operational protocols, escalation rules, and agent guidelines
- `vision/` — Project vision, architecture, and long-term goals
- `tasks/` — Current and past tasks, with status, owners, and dependencies
- `history/` — Logs, historic tickets, and PLAN.md snapshots
- `index.yaml` — Knowledge graph/index for fast bootstrapping and cross-referencing

## Usage
- Agents and LLMs should read the `index.yaml` on startup to build their context.
- All files use YAML frontmatter for metadata, and cross-link to related files by unique ID.
- Both Markdown (for humans) and YAML/JSON (for agents) formats are used.

See `index.yaml` for the schema and cross-references.
