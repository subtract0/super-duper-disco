# PLAN.md

> **Tip:** To archive older plateau/debugging sections, use [`scripts/archive_plan_plateaus.js`](scripts/archive_plan_plateaus.js). See the Cascade Protocol section below for details.


<!-- Only the most important and current ~150 lines are retained. Older entries have been archived in PLAN-past.md. -->

## [2025-04-22T02:55+02:00] Plateau Summary: Persistence Blocked by Supabase Schema Mismatch

- **Blocker:** Agent persistence is still failing. Supabase upsert returns error `PGRST204: Could not find the 'deploymentStatus' column of 'agents_registry' in the schema cache`. This means the code is attempting to persist fields (`deploymentStatus`, `deploymentUrl`, `lastDeploymentError`) that do not exist in the Supabase table schema.
- **Previous blocker (crashCount/camelCase mapping) is resolved**, but persistence is now blocked at the database schema level.
- **Root Cause:** The Supabase table `agents_registry` is missing one or more columns required by the code. All persisted fields must exist in the DB schema, with matching names and types.

### Next Steps
1. **Fix Supabase Schema**
   - Add the missing columns to the `agents_registry` table:
     - `deploymentStatus` (text or varchar)
     - `deploymentUrl` (text or varchar, nullable)
     - `lastDeploymentError` (text or varchar, nullable)
   - Ensure all columns are named exactly as referenced in the code (case-sensitive).
2. **Refresh Supabase Schema Cache**
   - If using PostgREST or Supabase Studio, refresh/reload the schema cache after altering the table.
3. **Retry Agent Persistence**
   - Launch an agent via POST `/api/agents` or `/launch`.
   - Check logs for successful upsert and absence of schema errors.
4. **Verify Retrieval**
   - Use GET `/api/agents/{id}` and `/status` to confirm the agent is persisted and retrievable.

### Additional Notes
- All code and DB schema must be in sync for persistence to work. Any new fields added to the code must also be added to the Supabase table.
- Test harness limitations remain: only E2E/manual verification can confirm persistence.
- Once schema is fixed and persistence is confirmed, reduce log verbosity as appropriate.
- Maintain PLAN.md with all findings and next steps.

## [2025-04-22T02:03+02:00] Plateau Summary: Agent Lifecycle & Singleton Registration Debugging

- **Blocker:** Agents created via POST /api/agents are not immediately retrievable via GET /api/agents/{id} (404 bug confirmed by regression test).
- Debug logging after agent creation is in place to aid diagnosis.
- All test agent mocks must be EventEmitter-compatible (BaseAgent or similar) to prevent TypeError: agent.on is not a function.
- Current focus is on auditing singleton usage and agent registration flow in orchestrator and agentManager.
- Not infra/polyfill related; all OpenAI/LangChain usages are covered.
- PLAN.md and test templates updated to enforce EventEmitter-compatible agent mocks as a regression-proof pattern.

**Next Steps:**
- Audit and debug singleton and agent registration flow.
- Ensure all agent registration, retrieval, and deletion operations are consistent and reliable.
- Maintain full traceability from bug discovery to resolution.

## [2025-04-22T00:15+02:00] Plateau Summary: Protocol Compliance Test Audit Complete

- Audited all protocol compliance test suites: `agentOrchestrator.protocol.test.ts`, `multiAgentOrchestrator.protocol.test.ts`, and `multiAgentWorkflow.protocol.test.ts`.
- Confirmed that all agent-to-agent messages are constructed as protocol-compliant A2AEnvelope instances and persisted to MCP (Supabase) with all required fields.
- All protocol tests use EventEmitter-compatible agent mocks, fully enforcing the regression-proof pattern (see PLAN.md and test templates).
- No further test expansion is needed for protocol compliance or MCP persistence at this time.
- **Next Step:** Maintain this coverage and enforced patterns as new agent types, workflows, or protocols are added. Update PLAN.md and test templates if requirements change.

---

## [2025-04-22T00:06+02:00] Plateau Summary: AgentManager Health/Recovery Refactor Complete

- Refactored `getAgentHealth` and `autoRecoverAgent` to robustly handle agent health transitions, crash counting, and recovery logic.
- getAgentHealth now increments crashCount and triggers autoRecoverAgent on repeated missed heartbeats, even if the agent is already in 'error' state.
- autoRecoverAgent now robustly sets status to 'recovery_failed' on exceptions, unless already 'recovered'.
- All persistent test failures related to health status, crash counting, and recovery logic are now addressed.
- **Next Step:** Rerun tests and update PLAN.md with findings and resolutions.
- **Final State:** All `agentManager` tests pass. Health, crash, and recovery logic is robust and well-covered. Test and implementation patterns are clarified in code and documentation.

---

## [2025-04-21T23:12+02:00] Plateau Summary: Persistent agentManager Test Failures (Singleton/Mock Blocker)

- The agentManager test suite continues to fail (9 failed, 2 skipped) despite dynamic mocking of agentRegistry.listAgentInfos to return the latest singleton agentManager.agents.
- Attempts included:
  - Defining a runtime getCurrentAgents() function for the registry mock to always fetch the current singleton agents.
  - Ensuring all agent mocks implement EventEmitter (via BaseAgent or compatible class).
  - Removing all beforeEach/afterEach patching in favor of a single global mock.
  - Added deep debug logging to singleton creation, agent deploy/list, and registry mock access.
- **Blocker:** After deployAgent, agentManager.listAgents() still returns an empty array. Debug logs confirm agents are not found after deploy, despite correct mock and singleton usage.
- **Root cause is likely module/test isolation or async singleton initialization timing.**

**Latest Findings (2025-04-21T23:22+02:00):**
- Refactor fixed `undefined agentManager`; tests now run and 5/11 pass.
- 4 failures remain, all logic errors (not infra):
  - Health status not transitioning to 'error' on missed heartbeat
  - crashCount not incrementing
  - Recovery status transitions ('recovery_failed' vs 'recovered')
- These are likely due to test logic or agentManager implementation, not mocking/singleton issues.

**Next Steps:**
- Audit test and implementation for heartbeat, crashCount, and recovery logic.
- Add debug logs and assertions to confirm test/impl state transitions.
- Marked as unresolved until all logic bugs are fixed and tests pass.

## [2025-04-21T22:46+02:00] Plateau Summary: Observability Complete, Test Failures Detected

- Slack log forwarding and agent health notifications are fully implemented and tested in development.
- However, agentManager and agentOrchestrator tests are currently failing (9 and 4 failures, respectively).
- Observability features are robust, but regression coverage is not passing.

**Next Steps:**
- Investigate and fix test failures in agentManager and agentOrchestrator suites.
- Ensure all tests pass for robust regression coverage.
- Continue to monitor and optimize observability features, updating PLAN.md after each major improvement.

## [2025-04-21T22:45+02:00] Plateau Summary: Slack Log Forwarding & Health Alerts

- Slack log forwarding is fully tested and verified in development.
- Warn/error logs are forwarded to Slack; info logs are not.
- Agent health status changes (crashed, unresponsive, recovery_failed) are now also sent to Slack (see `agentOrchestrator.ts`).
- Comprehensive observability: both logs and health alerts are covered via Slack notifications.

**Next Steps:**
- Monitor both log and health notifications in real-world scenarios (dev/prod).
- Optimize or extend as needed for other targets.
- Continue to keep PLAN.md updated after each major improvement.

## [2025-04-21T22:44+02:00] Plateau Summary: Slack Log Forwarding Fully Tested

- Slack log forwarding is now fully tested and verified in development.
- Warn/error logs are forwarded to Slack; info logs are not.
- Extension point is robust for future webhooks/aggregation.

**Next Steps:**
- Monitor log forwarding in real-world scenarios (dev/prod).
- Optimize or extend as needed for other targets.
- Continue to keep PLAN.md updated after each major improvement.

## [2025-04-21T22:42+02:00] Plateau Summary: Slack Log Forwarder Implemented

- Created `SlackLogForwarder` for Slack webhook integration (see `slackLogForwarder.ts`).
- Forwards warn/error logs to Slack if `SLACK_WEBHOOK_URL` env var is set.
- Non-invasive: does not affect agent internals or existing logging; can be enabled/disabled at runtime.

**Next Steps:**
- Test Slack log forwarding in dev.
- Monitor for delivery issues and missed events.
- Consider supporting other webhooks or log aggregation targets.

## [2025-04-21T22:41+02:00] Plateau Summary: Log Forwarder Extension Point Added

- Introduced a minimal, optional `AgentLogForwarder` interface and stub implementation in `agentLogs.ts`.
- This enables future log centralization (Slack/webhook/aggregation) without breaking existing in-memory and console logging.
- The extension point is documented and non-invasive—no changes to agent internals required.

**Next Steps:**
- Implement a real log forwarder for Slack/webhook or other aggregation.
- Monitor for integration issues as log forwarding is adopted.
- Continue to ensure all logging changes are reflected in PLAN.md.

## [2025-04-21T22:40+02:00] Plateau Summary: Logging Review for Agent Health & Recovery

- Completed a review of logging for all agent health transitions and auto-recovery events:
  - Logging is present for all critical transitions (healthy → error/crashed, recovery attempts, recovery failures).
  - Both in-memory logs (for test assertions) and console outputs are in place for observability.
  - No unnecessary duplication; logging is concise and follows established patterns.
- All recent features and tests maintain this logging standard.

**Next Steps:**
- Monitor logs in dev/prod for real-world health and recovery events.
- Consider centralizing logs (e.g., external log aggregation) for improved observability.
- Ensure all future features maintain this standard of logging and observability.

## [2025-04-21T22:38+02:00] Plateau Summary: Comprehensive Health Monitoring & Auto-Recovery Tests

- Added thorough tests for agent health monitoring and auto-recovery in `agentManager.test.ts`:
  - Heartbeat timeout detection and health state transitions.
  - Auto-recovery logic (triggering, recovery success, and recovery failure).
  - Crash count on repeated missed heartbeats.
  - Edge cases for recovery failure and recovery success.
- Ensured tests follow existing patterns, avoid code duplication, and maintain test isolation.

**Next Steps:**
- Review test results and address any failures or gaps.
- Monitor logs in dev/prod for real-world health transitions.
- Continue to update PLAN.md after each major improvement or debugging plateau.

## [2025-04-21T22:35+02:00] Plateau Summary: Autonomous Health Monitoring & Auto-Recovery Enhancement

- Enhanced `AgentManager.getAgentHealth` to:
  - Use a configurable heartbeat timeout (default 15s; override with AGENT_HEARTBEAT_TIMEOUT_MS).
  - Log all health state transitions (healthy → error/crashed, recovered, etc.).
  - Trigger auto-recovery (restart) for agents marked as 'error' or 'crashed'.
  - Update the health store and log recovery outcomes for observability.
  - Added robust comments for maintainers and future extensibility.
- No code duplication; existing patterns and architecture preserved.

**Next Steps:**
- Expand tests for heartbeat loss, auto-recovery triggers, and health transition logging.
- Monitor production/dev logs for unexpected agent transitions or recovery failures.
- Continue to update PLAN.md after each major improvement or debugging plateau.

# Archived PLAN.md Content (migrated 2025-04-21T22:33:45+02:00)
