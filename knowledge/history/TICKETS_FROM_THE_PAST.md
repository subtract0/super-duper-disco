---
id: history-tickets
title: Tickets from the Past
tags: [tickets, history, archive]
updated: 2025-04-21
type: history
ingestion: true
supabase: true
---

# Tickets from the Past

[← Back to knowledge/PLAN.md](knowledge/PLAN.md) | [See knowledge/Backlog & Reference](knowledge/BACKLOG_REFERENCE.md)

---

## Purpose

*This file archives completed tickets, major architectural decisions, and learnings from past sprints. It provides a historical record for future agents and maintainers.*

---

## Completed Tickets

- [2025-04-18] **Modular knowledge base migration completed**
  - Migrated knowledge/PLAN.md, knowledge/TASK_STATE.md, knowledge/BACKLOG_REFERENCE.md, and knowledge/TICKETS_FROM_THE_PAST.md into structured knowledge/ directory with YAML frontmatter for ingestion and Supabase storage.
  - Updated all documentation and code references to new knowledge/ structure.
  - Verified ingestion script loads all knowledge files correctly.
- [2025-04-16] **AgentManager auto-recovery implemented**
  - Agents now restart automatically on crash, with health status tracked in-memory and exposed via API.
- [2025-04-15] **A2A protocol integration for agent messaging**
  - All agent-to-agent communications now use A2A protocol envelopes.
- [2025-04-14] **Persistent memory logging to Supabase**
  - Agents log key decisions and errors to Supabase for cross-session recall.

---

## Architectural Decisions & Learnings

- All agent state, health, and logs are sourced live from orchestrator and AgentManager—never from static DB records.
- Protocol compliance and escalation paths are enforced at every step.
- YAML frontmatter is required for all knowledge files to ensure ingestion and Supabase compatibility.
- All agent mocks in tests must inherit from BaseAgent or EventEmitter to avoid orchestration test failures (see knowledge/PLAN.md for test template update).
