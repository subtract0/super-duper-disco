# Protocol-Centric Agent Communication Requirements

## A2A Protocol (Agent-to-Agent)
- **Envelope Structure:**
  - `id`: unique message identifier (UUID)
  - `type`: message type (`task`, `status`, `control`, etc.)
  - `from`: sender agent ID
  - `to`: recipient agent ID
  - `protocol`: must be `A2A`
  - `createdAt`: timestamp (ms)
  - `body`: message payload (arbitrary JSON)
  - `threadId`: (optional) for message threading
  - `signature`: (optional) for message authentication
- **Requirements:**
  - All agent-to-agent messages must use this format
  - Support for threading, extensibility, and signatures
  - All orchestration, logging, and status flows must wrap messages in A2A envelopes

## Model Context Protocol (MCP)
- **Context Operations:**
  - `fetch`: retrieve context by key, agent, or scope
  - `update`: update context values
  - `subscribe`: receive updates when context changes
  - `broadcast`: share context changes to all subscribers
- **Envelope Structure:**
  - Should be compatible with A2A envelope, but with `protocol: 'MCP'`
  - Must support versioning and access control
- **Requirements:**
  - All context management (memory, persistent state, etc.) must use MCP-compliant messages
  - Agents must be able to query, update, and share context via MCP
  - Interoperability with A2A flows (e.g., context updates can be sent as A2A messages with protocol: 'MCP')

## Integration Plan
1. **Adapters:**
   - Extend `a2aAdapter.ts` for A2A message compliance
   - Create `mcpAdapter.ts` for Model Context Protocol compliance
2. **Refactoring:**
   - Refactor agent orchestration and messaging to use A2A envelopes by default
   - Refactor context/memory management to use MCP
3. **Testing:**
   - Write tests for protocol compliance, edge cases, and error handling
4. **Documentation:**
   - Document protocol usage and extension points for new agent types

## References
- [A2A Protocol](https://github.com/google/A2A)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)

---

# Protocol Usage & Extension Guide

## Using the A2A Protocol

- **Build an A2A Envelope:**
  Use `buildA2AEnvelope({ type, from, to, body, ... })` from `a2aAdapter.ts` to wrap all agent-to-agent messages.
- **Parse/Validate:**
  Use `parseA2AEnvelope(msg)` to validate and extract envelope fields.
- **Integration:**
  All agent orchestration, workflow, and logging should use A2A envelopes for message passing.
- **Extension Points:**
  - Add new message `type` values as needed (e.g., `control`, `custom`)
  - Implement signature and threadId for advanced flows (e.g., authentication, conversation threading)
  - Extend the envelope or adapter with additional metadata as required by new agent types

## Using the Model Context Protocol (MCP)

- **Build an MCP Envelope:**
  Use `buildMCPEnvelope({ type, from, to, body, ... })` from `mcpAdapter.ts` for all context/memory operations.
- **Parse/Validate:**
  Use `parseMCPEnvelope(env)` to check envelope validity and extract context operations.
- **Integration:**
  Agents should use MCP envelopes for all context fetch, update, subscribe, and broadcast operations.
- **Extension Points:**
  - Add new operation `type` values (e.g., `delete`, `sync`)
  - Use the `version` field for protocol upgrades and backward compatibility
  - Implement custom access control or provenance fields as needed

## Developer Instructions

- Always use the provided adapter functions for envelope creation and parsing—do not hand-craft envelopes.
- When adding new agent types, ensure all inter-agent and context messages use the correct protocol adapters.
- For protocol upgrades, extend the envelope interfaces and adapter logic, maintaining backward compatibility via the `version` field.
- See the test suites (`*.test.ts`) for compliance and edge case examples.

## Example: Adding a New Agent Type

1. Implement your agent logic in the appropriate module.
2. For agent-to-agent messaging, use `buildA2AEnvelope` and `parseA2AEnvelope`.
3. For context/memory operations, use `buildMCPEnvelope` and `parseMCPEnvelope`.
4. Update the orchestrator/manager to recognize and route messages for the new agent type.
5. Add tests for protocol compliance and edge cases.

## Best Practices
- Prefer protocol extension over breaking changes.
- Document all new message types and envelope fields in this file.
- Maintain high test coverage for all protocol adapters and flows.

---

# Automated Protocol Regression Tests & CI Integration

## Overview
- All protocol adapters and envelope builders/parsers (A2A, MCP, Model Context) are covered by dedicated Jest test suites in `src/protocols/`.
- These tests verify compliance, negotiation, backward compatibility, and edge cases for every protocol version and extension point.
- Any change to protocol logic is automatically checked for regressions.

## CI Integration
- The protocol test suites are included in the main test pipeline and must pass for all PRs/merges.
- To run only protocol regression tests locally:
  ```sh
  npx jest --config=src/protocols/jest.protocol.config.cjs
  ```
- To run all tests (including protocol and orchestration):
  ```sh
  npm test
  ```
- CI will fail on any protocol compliance or negotiation regression.

## Developer Instructions
- When modifying or extending protocol logic, always update/add tests in `*.test.ts` files in the same directory.
- Do not merge changes unless all protocol regression tests pass.
- For new protocol versions, add negotiation and fallback tests.

## Badge

> **Protocol Compliance:** ![Protocol Compliance: Enforced by CI](https://img.shields.io/badge/protocol--compliance-enforced-brightgreen)
