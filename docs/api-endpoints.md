# API Endpoints for Agent Orchestrator System

This document describes the main API endpoints for managing and monitoring agents in the Agent Orchestrator system. All endpoints reflect the **live, in-memory state** of agents, not just static database records.

---

## `/api/agents` (GET, POST)

- **GET**: Returns all currently running or known agents, with live health, logs, last heartbeat, and last activity. Uses orchestrator and agentManager as the source of truth.
- **POST**: Deploys a new agent. Accepts `{ type, host, config }` in the body. Returns the launched agent.

## `/api/agents/[id]` (GET, DELETE)

- **GET**: Returns details for a specific agent (live state).
- **DELETE**: Stops the agent, updates its status to 'crashed'.

## `/api/agents/[id]logs` (GET)

- **GET**: Returns the 50 most recent logs for a specific agent.

## `/api/orchestrator-state` (GET)

- **GET**: Returns orchestrator-wide state, including health for all agents and the 50 most recent logs (across all agents).

## `/api/agent-health` (GET)

- **GET**: Returns health status for all agents (live, in-memory).

## `/api/agent-logs` (GET)

- **GET**: Returns the 50 most recent logs across all agents (aggregated).

---

**Note:** All endpoints are designed to reflect the real-time, in-memory state of the system. For persistent or historical records, refer to Supabase or other storage integrations.

---

_Last updated: 2025-04-18_
