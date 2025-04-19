# Project Plan (PLAN.md)

This is the present and future roadmap for the Agent Broker system, maintained according to the [Cascade Autonomous Development Protocol](./Cascade_Autonomous_Development_Protocol.md).

**For all completed and historical tickets, see [`TICKETS_FROM_THE_PAST.md`](./TICKETS_FROM_THE_PAST.md).**

---

# Conversational Agent Builder Roadmap

## Vision
Enable users to describe a feature to a Telegram bot, which triggers a multi-agent system to build, test, review, and deploy agents on demand, with oversight and quality control, all orchestrated and deployed remotely/serverless.

**Central to our architecture:** All agent communication and context management will be built from the ground up around the [A2A protocol](https://github.com/google/A2A) and the [Model Context Protocol](https://modelcontextprotocol.io/introduction). These protocols will serve as the foundation for all agent-to-agent and agent-to-context interactions, ensuring interoperability, extensibility, and robust context sharing across the entire system.

The framework must also learn persistently from its interactions and project work: it should save important learnings, pitfalls, and operational context (such as OS quirks, PowerShell/Windows specifics, and other environment-dependent knowledge) to Supabase as a persistent memory. This memory should be accessible across all deployments and sessions, enabling the system to improve, adapt, and share context no matter where it is run from.

---

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

### Extension Points & Future Work
- The system is modular and ready for extension with new agent types and protocols.
- If OS-level background processes are needed (beyond Node in-memory), extend AgentManager with child_process or worker_threads.
- Persistent memory and advanced context sharing should be implemented using the Model Context Protocol and Supabase.

### Testing & Documentation
- Write thorough tests to simulate agent crash/recovery and protocol workflows.
- Keep PLAN.md and protocol documentation up to date for new contributors and scaling.

---

## Milestones & Tasks

### 0. Protocol-Centric Agent Communication (A2A & Model Context Protocol)
- [ ] **Objective:** Implement A2A and Model Context Protocol as the foundation for all agent communication and context management.
  - [ ] Research and document requirements for A2A and Model Context Protocol
  - [ ] Build core adapters and middleware for agent-to-agent (A2A) and agent-to-context (Model Context Protocol) messaging
  - [ ] Refactor all agent orchestration, messaging, and memory flows to use these protocols as the default
  - [ ] Write comprehensive tests for protocol compliance and edge cases
  - [ ] Document protocol usage and extension points for new agent types

### 1. Multi-Agent Orchestration Foundation
- [x] **Objective:** Refactor and extend the Agent Manager and Orchestrator for dynamic, in-memory agent lifecycle management and health monitoring.
  - [x] Agents can be launched, stopped, monitored, and auto-recovered
  - [x] Health status, logs, and live state are accessible via API/dashboard
  - [x] Modular support for native, LangChain, and AutoGen agents
  - [x] Audit and refactor `src/orchestration/agentManager.ts` and `agentOrchestrator.ts`
  - [x] Implement in-memory health store, heartbeats, and auto-restart
  - [x] Add/extend API endpoints and dashboard for live state
  - [ ] Tests for orchestrator-state endpoint & health flows
  - [ ] Telegram commands: `/status`, `/stop <id>`, `/restart <id>`

### 2. Telegram Bot Conversational Interface
- [x] **Objective:** Upgrade `/api/telegram` endpoint and bot logic to accept natural language feature requests and route them to the orchestration system.
  - [x] Telegram bot receives feature requests and parses intent
  - [x] Regex-based parser generates actionable agent creation tickets
  - [ ] User receives status updates and deployment links via Telegram
  - [x] Integrate OpenAI for response generation
  - [ ] Connect Telegram endpoint to orchestration API
  - [ ] Implement status and error feedback loop to user
  - [ ] Tests covering `/status` & error flows

### 3. On-Demand Agent Creation (Builder Agent)
- [x] **Objective:** Implement a Builder Agent that breaks down user feature requests into development tickets, triggers agent creation, and coordinates the build pipeline.
  - [x] Builder Agent receives parsed requests and creates tickets
  - [x] Tickets are processed according to the Cascade Protocol
  - [ ] New agents are automatically built, tested, and deployed
  - [x] Implement Builder Agent logic and ticket creation
  - [x] Integrate with Orchestrator and Agent Manager
  - [ ] Ensure ticket traceability and test coverage

### 4. Quality Control Agent (QC Agent)
- [ ] **Objective:** Implement a QC Agent that reviews agent outputs, test results, and code quality before deployment.
  - [ ] QC Agent runs automated tests and acceptance checks
  - [ ] Can halt or roll back deployment on failure
  - [ ] Provides feedback and status to user and orchestrator
  - [ ] Implement QC Agent logic and hooks
  - [ ] Integrate with Builder Agent and Orchestrator
  - [ ] Add notification and rollback mechanisms

### 5. Automated Deployment & Feedback
- [ ] **Objective:** Seamlessly deploy new/updated agents to Vercel/serverless or remote Docker, with robust feedback to users and dashboard.
  - [ ] Agents are deployed remotely/serverless on completion
  - [ ] User receives deployment status and links via Telegram
  - [ ] Dashboard/API reflects deployed agents and health
  - [ ] Integrate deployment pipeline with Vercel/serverless
  - [ ] Sync deployment status to dashboard and Telegram
  - [ ] Add failsafe and rollback for failed deployments

### 6. Continuous Improvement & Extensibility
- [ ] **Objective:** Ensure the system is modular, secure, and easy to extend with new agent types, workflows, or integrations.
- **Acceptance Criteria:**
  - New agent types and workflows can be added with minimal code changes
  - Security, logging, and permissioning are robust
  - Regression/failure triggers critical alert and halts pipeline
- **Steps:**
  - Refactor for modularity and plug-in support
  - Implement logging, permission checks, and regression alerts
  - Document extension and integration process

---

## Next Steps
- Begin with Milestone 1: Audit and extend orchestration code for dynamic agent management.
- Proceed stepwise through each milestone, following the Cascade Autonomous Development Protocol for ticketing, testing, and deployment.

---

## Planned Modularization: Telegram API Handler

---

## Appendix: Agent Broker & Swarm Roadmap

---

## Multi-Agent Orchestration: LangChain & AutoGen

### Objective
Design and implement a robust, production-grade multi-agent orchestration system where agents with different roles, tools, and memory can collaborate on complex tasks. Ensure high reliability (health monitoring, auto-recovery), extensibility (plug-in agent types), and support for advanced LLM workflows.

### Milestones
1. **Agent Lifecycle Management**
   - Launch, stop, restart agents as processes
   - Monitor health (pending, healthy, crashed, restarting)
   - Auto-recovery for crashed agents
2. **Agent Types & Integration**
   - Native agents (custom logic)
   - LangChain agents (LLM, tools, memory)
   - AutoGen agents (multi-agent conversation, team coordination)
   - Hybrid agents (LangChain-powered brains inside AutoGen agents)
3. **Multi-Agent Workflow**
   - Role-based agents (Planner, Researcher, Coder, etc.)
   - Each agent tracks its own conversation history (memory)
   - Agents can use tools/APIs/code
   - Round-robin or protocol-driven collaboration
   - Task decomposition and delegation
4. **Health & Reliability**
   - In-memory health store
   - Heartbeats and health checks
   - Auto-restart on crash
   - Dashboard/API reflect live state
5. **Extensibility**
   - Plug-and-play agent types
   - Add new roles, tools, or workflows easily
   - Support both single-agent and multi-agent scenarios

### Acceptance Criteria
- Agents of different types (native, LangChain, AutoGen) can be launched, stopped, and monitored
- Health status is tracked and auto-recovery is triggered on crash
- Agents can collaborate on a task, passing messages with role/context awareness
- System supports extension with new agent types, tools, and workflows
- Comprehensive tests cover agent lifecycle, health, and collaboration

### Recommended Technical Approach
- Use Node.js + TypeScript for orchestration and agent management
- Implement agent classes for each type; use LangChain for LLM/tool/memory, AutoGen for multi-agent protocols
- Orchestrator manages process lifecycle, health, and recovery
- Agents communicate via message passing, with role/context prompts and memory
- Add APIs and dashboard to reflect live agent state and logs
- Write integration tests for all critical flows

---

## Planned Modularization: Telegram API Handler

---

## Appendix: Agent Broker & Swarm Roadmap

### Ticket 1: Add Navigation and UX Polish
- **Objective:** Ensure seamless, intuitive navigation between all major app areas.
- **Acceptance Criteria:**
  - Navigation bar or persistent header/footer across all pages
  - Clear "Home" and "Agent Swarm Dashboard" links
  - Keyboard navigation and accessibility (ARIA roles, focus states)
- **Recommended Approach:**
  - Implement responsive navigation with accessibility best practices
  - Add breadcrumbs for multi-step flows

### Ticket 2: Card Art Customization & Upgrade
- **Objective:** Replace placeholder card art with dynamic, visually appealing images.
- **Acceptance Criteria:**
  - Each card displays unique, relevant art (AI-generated or curated)
  - High contrast and alt text for accessibility
- **Recommended Approach:**
  - Integrate with DALL-E, Stable Diffusion, or Unsplash API
  - Allow users to upload their own card art
  - Fallback to a default image if loading fails

### Ticket 3: Agent Idea Generation via LLM
- **Objective:** Make agent idea generation creative, context-aware, and delightful.
- **Acceptance Criteria:**
  - Card ideas are novel, relevant, and non-repetitive
  - Personalization: ideas reflect user history/preferences
- **Recommended Approach:**
  - Use OpenAI or similar for idea generation
  - Cache/deduplicate ideas
  - Add user feedback on idea quality (like/dislike)

### Ticket 4: Agent Card Details Modal
- **Objective:** Let users preview and configure agent details before deployment.
- **Acceptance Criteria:**
  - Modal/dialog shows agent details, config, and preview art
  - Keyboard accessible and screen reader friendly
- **Recommended Approach:**
  - Add modal to AgentBrokerCardDeck
  - Support inline config editing with validation

### Ticket 5: Agent Deployment Feedback & History
- **Objective:** Give users instant, clear feedback and a sense of progress.
- **Acceptance Criteria:**
  - Toasts/banners for deployment success/failure
  - Accessible status updates (ARIA live regions)
  - Deployment history with filtering/search
- **Recommended Approach:**
  - Integrate toast notifications
  - Add a timeline/history section to the dashboard

### Ticket 6: Agent Broker Gamification
- **Objective:** Add delight and replay value with gamified mechanics.
- **Acceptance Criteria:**
  - Cards display rarity, special effects, or unlockable skins
  - Achievements, streaks, and daily rewards
- **Recommended Approach:**
  - Extend card data with rarity, effects, unlocks
  - Track user actions and display badges/achievements
  - Add celebratory animations (confetti, sound cues)

### Ticket 7: Agent Broker API Security & Rate Limiting
- **Objective:** Protect endpoints and ensure fair, safe usage.
- **Acceptance Criteria:**
  - API rate limits per user/IP
  - Sensitive actions require authentication
  - Security tested for abuse vectors
- **Recommended Approach:**
  - Use middleware for rate limiting and auth
  - Add automated security tests

### Ticket 8: End-to-End Tests for Broker Flow
- **Objective:** Guarantee reliability and confidence in the user journey.
- **Acceptance Criteria:**
  - E2E tests cover all major flows (idea → card → deploy → feedback)
  - Accessibility checks in tests
- **Recommended Approach:**
  - Use Cypress/Playwright for UI tests
  - Mock backend APIs and simulate errors

### Ticket 9: Multi-Agent Orchestration & Swarm Modes
- **Objective:** Enable advanced, collaborative agent scenarios.
- **Acceptance Criteria:**
  - Deploy/manage multiple agents as a "swarm"
  - Swarm visualization and control panel
  - Configurable collaborative/competitive modes
- **Recommended Approach:**
  - Extend AgentOrchestrator for multi-agent logic
  - Add UI for swarm management/visualization

### Ticket 10: Documentation & Demo Walkthrough
- **Objective:** Make onboarding and learning delightful and easy.
- **Acceptance Criteria:**
  - Docs with diagrams, screenshots, and video walkthroughs
  - Interactive onboarding tour for new users
- **Recommended Approach:**
  - Add markdown docs and diagrams
  - Implement a guided tour/onboarding modal in UI

### Ticket 11: User Onboarding & First-Time Experience
- **Objective:** Welcome new users and guide them through first actions.
- **Acceptance Criteria:**
  - Friendly welcome screen and step-by-step intro
  - Tooltips for key features
- **Recommended Approach:**
  - Add onboarding modal or tour
  - Highlight important actions with contextual tips

### Ticket 12: Accessibility & Inclusivity Audit
- **Objective:** Ensure the app is usable by everyone, regardless of ability.
- **Acceptance Criteria:**
  - All interactive elements are keyboard accessible
  - Sufficient color contrast, alt text, and ARIA labels
  - Tested with screen readers
- **Recommended Approach:**
  - Run accessibility audits (axe, Lighthouse)
  - Address all critical issues and document improvements

### Ticket 13: Advanced Agent Customization
- **Objective:** Let users deeply personalize deployed agents.
- **Acceptance Criteria:**
  - UI for editing agent name, avatar, and behavior
  - Save/load agent templates
- **Recommended Approach:**
  - Add agent config editor modal
  - Allow export/import of agent configs

### Ticket 14: Visual Theme Selector & Dark Mode
- **Objective:** Let users choose visual themes for greater appeal.
- **Acceptance Criteria:**
  - Toggle between light/dark/system themes
  - Option to select card deck styles (e.g., fantasy, sci-fi)
- **Recommended Approach:**
  - Integrate theme switcher in navigation
  - Store user preference in local storage

### Ticket 15: Community & Sharing Features
- **Objective:** Foster community and sharing of agent ideas/configs.
- **Acceptance Criteria:**
  - Users can share agent cards/configs via link or QR code
  - Option to browse popular/shared agents
- **Recommended Approach:**
  - Implement share/export feature for agents
  - Add public gallery of community agents

---

- `pages/api/telegram.ts` is approaching 200 lines and contains multiple responsibilities (file handling, transcription, OpenAI calls, DB operations, etc.).
- To maintain codebase cleanliness and follow project rules, plan to:
  - Extract file handling (Telegram file download, Supabase upload) into `utils/telegram/file.ts`.
  - Extract transcription logic (Whisper API) into `utils/telegram/transcription.ts`.
  - Extract OpenAI interaction into `utils/telegram/openai.ts`.
  - Extract Supabase message operations into `utils/telegram/db.ts`.
- The API handler will then focus on request routing and orchestration, staying under 200 lines and easier to test and maintain.
- This modularization will not affect dev/prod environments, only code organization.

---

### ✅ Agent Restart/Recovery Logic & UI Notification (COMPLETED)
- **Objective:** Implement agent restart/recovery logic and display recovery status in the UI, including user notification via toast.
- **Acceptance Criteria:**
  - Agents can be manually and automatically recovered after crash
  - UI displays recovery status and notifies user of recovery events
  - All code and tests updated for persistent crashed agents
  - Type safety for all health states
  - Toast notifications for recovery events (success, info, error)
- **Status:** Completed and committed (see git log for details)

### 6. Documentation and Architecture Ticket
- **Objective:** Keep documentation (README.md, DOC.md, PLAN.md) in sync with code and architecture changes.
- **Acceptance Criteria:**
  - All docs are up-to-date after major changes, including agent recovery and notification logic
  - PLAN.md reflects new tickets and completed work
  - PLAN.md must be kept up to date after every major change (see Documentation Policy)
- **Recommended Approach:**
  - Add/update docs as part of PR acceptance checklist
  - PLAN.md, README.md, and DOC.md must all be updated after every major change
  - Document agent lifecycle, health states, and notification flow

### 7. Swarm Agent Orchestration (Autogen & LangChain)
- **Objective:** Integrate autogen 0.2 and LangChain to orchestrate and manage multiple agents.
- **Acceptance Criteria:**
  - System can launch, monitor, and coordinate multiple agent processes.
  - Agents can communicate and share state as needed.
  - Swarm can be started/stopped programmatically or via config.
- **Recommended Approach:**
  - Add a new orchestration module using autogen 0.2 primitives.
  - Use LangChain for agent composition and workflow logic.
  - Document agent lifecycle and communication patterns.

### 8. Agent Specialization & Registration
- **Objective:** Enable specialization of agents for tasks (Telegram, file, voice, etc.) and register them dynamically.
- **Acceptance Criteria:**
  - Agents can be dynamically registered with the swarm.
  - Each agent can declare its specialization and capabilities.
  - Swarm can route tasks to the appropriate agent.
- **Recommended Approach:**
  - Define an agent registry and capability schema.
  - Implement dynamic agent registration and routing logic.

### 9. Remote & Codeless Deployment Interface
- **Objective:** Allow agents to be deployed remotely or codelessly (via config, UI, or API).
- **Acceptance Criteria:**
  - Agents can be launched on remote hosts or containers.
  - Users can deploy new agents without code changes (via config or web UI).
  - System validates and manages agent deployments.
  - UI/UX meets the requirements outlined in Ticket 13 (see below).
- **Recommended Approach:**
  - Add a deployment manager supporting remote hosts (e.g., SSH, Docker, cloud).
  - Build a config-driven or web-based deployment UI/API.
  - Document deployment flows for technical and non-technical users.
  - Collaborate with UI/UX team to ensure usability for non-technical users.

### 13. UI/UX for Codeless Agent Deployment
- **Objective:** Make it possible for technical and non-technical users to deploy, manage, and monitor agents in the swarm without writing code.
- **Acceptance Criteria:**
  - Step-by-step agent deployment wizard (choose type, set config, environment, etc.).
  - Visual agent registry and dashboard with health/status, logs, and controls.
  - Edit agent configs via forms, upload/download config files, versioning.
  - Support for remote/multi-host deployment (add hosts, deploy to hosts, monitor usage).
  - User-friendly error handling and notifications (email, Slack, etc.).
  - Role-based access control and secure secret management via UI.
  - Inline help, tooltips, and guided tutorials for new users.
- **Recommended Approach:**
  - Design and implement a web UI using a modern stack (e.g., Next.js, React, Chakra UI, or similar).
  - Integrate with backend deployment manager and agent registry APIs.
  - Gather feedback from both technical and non-technical users for iterative improvement.

### 10. Swarm Health, Monitoring & Recovery
- **Objective:** Monitor agent health, recover crashed agents, and provide admin visibility.
- **Acceptance Criteria:**
  - Swarm dashboard or CLI shows agent status, logs, and resource usage.
  - Crashed agents are automatically restarted or replaced.
  - Admins are notified of failures and can intervene.
- **Recommended Approach:**
  - Integrate health checks and auto-restart logic.
  - Add basic dashboard or CLI for monitoring and control.

### 11. Security, Permissions & Isolation
- **Objective:** Ensure agents are sandboxed and only have access to their permitted resources.
- **Acceptance Criteria:**
  - Each agent runs with least privilege.
  - Communication is authenticated and encrypted.
  - Sensitive data is protected in transit and at rest.
- **Recommended Approach:**
  - Use OS/container isolation and environment variables.
  - Add agent authentication and encrypted channels.
  - Document security model and best practices.

### 12. Documentation & Example Deployments
- **Objective:** Provide clear documentation and ready-to-use examples for agent swarm deployment.
- **Acceptance Criteria:**
  - Docs cover architecture, setup, agent registration, deployment, and monitoring.
  - Example configs for local, remote, and cloud deployment.
  - Agent health states and log format are fully documented in DOC.md.
  - Troubleshooting for Windows/Next.js (path, port, Jest issues) is now included in DOC.md and README.md.
  - Tutorials for both technical and non-technical users.
- **Recommended Approach:**
  - Update README, DOC.md, and add example config files.
  - Provide step-by-step guides for common deployment scenarios.

### 7. Protocol Adherence Ticket
- **Objective:** Ensure all autonomous work and ticket breakdowns follow the [Cascade Autonomous Development Protocol](./Cascade_Autonomous_Development_Protocol.md)
- **Acceptance Criteria:**
  - All tickets have clear objectives, acceptance criteria, and technical approach
  - Deep research and refinement steps are followed for new features
- **Recommended Approach:**
  - Review PLAN.md and all tickets for protocol compliance before implementation
