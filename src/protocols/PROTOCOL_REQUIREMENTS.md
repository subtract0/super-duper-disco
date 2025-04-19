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
