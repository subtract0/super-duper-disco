# Contributing to Cascade Agents

## Agent Implementation Guidelines

- **EventEmitter Contract:** All agent classes and mocks used in orchestration or protocol tests must extend `BaseAgent` or otherwise implement the Node.js `EventEmitter` interface. This prevents test failures due to missing `.on` or `.emit` methods.
- **Test-Environment Guards:** All agents must check for `process.env.NODE_ENV === 'test'` or `process.env.JEST_WORKER_ID` and avoid starting timers, intervals, or persistent logging in test mode. This ensures clean test runs and prevents Jest teardown errors or timeouts.
- **Persistent Logging:** Never mock or stub persistent memory for dev/prod environments. Only use test doubles for tests.

## Testing Guidelines

- **Test Templates:** Use `tests/protocol/__TEMPLATE__.agent.test.ts` as a starting point for new agent tests. This template enforces the EventEmitter contract and test-environment guard patterns.
- **Mocks:** All agent mocks must implement the EventEmitter interface (preferably by extending `BaseAgent`).
- **Protocol Compliance:** When asserting MCP persistence, only check protocol-required fields. Use `expect.any(String)` for content and timestamps, as the MCP record is a mapped structure, not a direct copy of the protocol envelope.

- **Agent Mock Compliance Lint:**
  - Run `node .cascade-lint.js` from the project root to check that all agent mocks in test files extend `BaseAgent` or implement `EventEmitter`.
  - This script will print a warning for any violations.
  - Consider adding this script to your CI pipeline to enforce compliance automatically.

## Documentation

- Update `PLAN.md` after each major change, especially when refactoring agent patterns, test templates, or protocol logic.
- Document any new patterns or deviations from these guidelines in this file.

## References
- [A2A Protocol](https://github.com/google/A2A)
- [Model Context Protocol](https://modelcontextprotocol.io/introduction)
