---
id: vision-project
title: Project Vision & Architecture
tags: [architecture, goals, vision]
updated: 2025-04-21
type: vision
ingest: true
supabase: true
---

# Project Vision & Architecture

[← Back to knowledge/PLAN.md](../knowledge/PLAN.md) | [See knowledge/Backlog & Reference](../knowledge/BACKLOG_REFERENCE.md)

## Vision

Enable users to describe a feature to a Telegram bot, which triggers a multi-agent system to build, test, review, and deploy agents on demand, with oversight and quality control, all orchestrated and deployed remotely/serverless.

**Autonomous-First Principle:**
All architectural decisions and protocols are chosen to maximize agent autonomy, minimize human prompts, and ensure robust self-recovery and error handling. Agents are expected to operate independently, escalate only when protocol requires, and always update persistent memory with key context and learnings.

**Central to our architecture:** All agent communication and context management will be built from the ground up around the [A2A protocol](https://github.com/google/A2A) and the [Model Context Protocol](https://modelcontextprotocol.io/introduction). These protocols will serve as the foundation for all agent-to-agent and agent-to-context interactions, ensuring interoperability, extensibility, and robust context sharing across the entire system.

The framework must also learn persistently from its interactions and project work: it should save important learnings, pitfalls, and operational context (such as OS quirks, PowerShell/Windows specifics, and other environment-dependent knowledge) to Supabase as a persistent memory. This memory should be accessible across all deployments and sessions, enabling the system to improve, adapt, and share context no matter where it is run from.

## Autonomous Agent Best Practices

- Always operate stepwise according to the active roadmap and protocol.
- Log all important decisions, errors, and learnings to persistent memory (Supabase).
- Prefer self-healing, retries, and protocol-compliant escalation over prompting the user.
- Share operational context and learnings for future autonomous agents.
- Validate that all actions are in line with the Cascade Autonomous Development Protocol.

## Current Architecture Overview

### Agent Lifecycle & Management
- **AgentManager** manages all agent lifecycles in-memory, allowing agents to be launched, stopped, monitored, and auto-recovered. Agents are tracked in a map and can be queried for health, logs, and activity. All agent state is live and up-to-date.
- **AgentOrchestrator** coordinates agent deployment, monitoring, and recovery, leveraging AgentManager. It includes auto-recovery logic and integrates with persistent stores for logging and health tracking. No duplication of agent state.
- **MultiAgentOrchestrator** coordinates workflows between multiple agents (planner, researcher, developer, devops), using A2A protocol envelopes for structured inter-agent messaging. Health and logs are always pulled from AgentManager for the dashboard and protocol summaries.

### Protocols & Inter-Agent Messaging
- **A2A Protocol** is used for structured agent-to-agent communication.
- **Model Context Protocol** is referenced for context management and should be integrated wherever agent memory or context is needed.

### Dashboard & API Integration
- All dashboards and API endpoints reflect the live state of running agents, not just static DB records. This enables real-time monitoring and control.
- **Architectural Guarantee:** All agent state, health, and logs exposed to APIs and dashboard components MUST always be sourced from the orchestrator (which delegates to AgentManager) and the global agentLogStore singleton. No endpoint or component may use stale, static, or duplicated agent data. This ensures that all monitoring and control is accurate, real-time, and consistent across the system.

### Extension Points & Future Work
- The system is modular and ready for extension with new agent types and protocols.
- If OS-level background processes are needed (beyond Node in-memory), extend AgentManager with child_process or worker_threads.
- Persistent memory and advanced context sharing should be implemented using the Model Context Protocol and Supabase.

## Appendix: Multi-Agent Orchestration (LangChain & AutoGen)

### Objective
