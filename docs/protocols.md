# Protocol Integration Requirements: A2A & Model Context Protocol

## Overview
This document outlines the requirements and integration plan for making [A2A](https://github.com/google/A2A) and [Model Context Protocol](https://modelcontextprotocol.io/introduction) the foundation of all agent-to-agent and agent-to-context communication in our system.

---

## 1. A2A Protocol (Agent-to-Agent)
- **Purpose:** Standardizes secure, interoperable messaging between autonomous agents.
- **Core Concepts:**
  - Message envelopes with sender, recipient, thread, and protocol type
  - Support for extensible message types (task, status, control, etc.)
  - Cryptographic signatures and optional encryption
  - Threaded conversations and protocol negotiation
- **Key Requirements:**
  - All agent-to-agent communication must use A2A message envelopes
  - Message routing must support thread/context tracking
  - Support for extensible message types and protocol negotiation
  - Optional: implement cryptographic signing for message authenticity
- **References:**
  - [A2A Spec](https://github.com/google/A2A)

## 2. Model Context Protocol
- **Purpose:** Standardizes how agents exchange, retrieve, and update context/memory across tools and sessions.
- **Core Concepts:**
  - Context objects with unique IDs, type, and version
  - Standardized API for get/set/update context
  - Support for context provenance, access control, and versioning
- **Key Requirements:**
  - All agent memory/context operations must use the Model Context Protocol
  - Agents must be able to retrieve, update, and share context objects
  - Context provenance and access control must be respected
- **References:**
  - [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)

---

## 3. Integration Plan

### a. Integration Points (Now Protocol-Driven)
- Agent orchestration (launch, stop, restart): All communication uses A2A envelopes
- Agent-to-agent message bus: Only A2A protocol-compliant envelopes are allowed
- Agent memory/context storage and retrieval: All persistent and in-memory context uses Model Context Protocol objects
- API endpoints for agent communication and context: Must accept/emit protocol-compliant objects

### b. Adapter/Middleware Tasks (**Completed**)
- [x] Implement A2A message envelope builder/parser (`src/protocols/a2aAdapter.ts`)
- [x] Refactor message bus to use A2A envelopes (orchestrators, workflows)
- [x] Implement Model Context Protocol adapter for agent memory (`src/protocols/modelContextAdapter.ts`)
- [x] Refactor context/memory flows to use protocol API (`persistentMemory.ts`, workflows)
- [x] Add tests for protocol compliance (`tests/protocols/*.test.ts`)

### c. Documentation & Extension Guidelines
- [x] Document new message formats and context flows (see below)
- [x] Provide extension guidelines for new agent types

---

## 4. Usage Examples

### A2A Protocol Envelope (Agent-to-Agent Messaging)
```typescript
import { buildA2AEnvelope } from '../protocols/a2aAdapter';

const envelope = buildA2AEnvelope({
  type: 'task',
  from: 'agent1',
  to: 'agent2',
  body: { instruction: 'Do X' },
});
// Send envelope via message bus
```

### Model Context Protocol (Agent Memory/Context)
```typescript
import { buildModelContext } from '../protocols/modelContextAdapter';

const ctx = buildModelContext({
  id: 'ctx-123',
  type: 'learning',
  version: '1',
  value: { content: 'Learned X', tags: ['tag1'] },
  provenance: 'agent1',
});
// Store/retrieve ctx via persistentMemory
```

---

## 5. Extension Guidelines for New Agent Types
- All new agent types must use `buildA2AEnvelope` for sending messages
- All context/memory operations must use Model Context Protocol objects
- Tests for protocol compliance are required for all new agent types and workflows
- See `tests/protocols/` for examples

---

## 6. Protocol Foundation Milestone (**Completed**)
- All core agent communication and context/memory flows are protocol-compliant
- Adapters and tests are in place and enforced
- See PLAN.md for next milestone: multi-agent orchestration, UI integration, and advanced features

---

*This document is now up to date with protocol-driven architecture. Continue to use these protocols for all new development.*
