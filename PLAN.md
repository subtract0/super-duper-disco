# Project Backlog (PLAN.md)

This backlog is maintained according to the [Cascade Autonomous Development Protocol](./Cascade_Autonomous_Development_Protocol.md). Each ticket below follows the protocol: clear objective, acceptance criteria, and recommended technical approach.

---

## Backlog Tickets

### 1. Core Test: Text Message Flow
- **Objective:** Ensure a text message sent to Telegram is processed, stored in Supabase, and replied to by the agent.
- **Acceptance Criteria:**
  - Text message is received and saved in Supabase
  - Agent reply is generated via OpenAI and sent back to Telegram
  - Test passes with mocked Telegram and OpenAI APIs
- **Recommended Approach:**
  - Write an integration test for the `/api/telegram` endpoint using mocked dependencies

### 2. Core Test: File Upload Flow
- **Objective:** Verify images/documents from Telegram are downloaded, uploaded to Supabase, and URLs are stored.
- **Acceptance Criteria:**
  - File is received, uploaded to Supabase Storage
  - URL is saved in Supabase messages
  - Test passes with mocked file and Supabase APIs
- **Recommended Approach:**
  - Add a test with a sample image/document message and validate storage logic

### 3. Core Test: Voice Transcription Flow
- **Objective:** Confirm a voice message is transcribed using Whisper and the result is processed and replied to.
- **Acceptance Criteria:**
  - Voice message is received, transcribed, and stored
  - Agent reply is generated and sent
  - Test passes with mocked Whisper and OpenAI APIs
- **Recommended Approach:**
  - Add a test for voice message handling with transcription mocking

### 4. Core Test: OpenAI Integration
- **Objective:** Ensure agent replies are generated and saved using OpenAI (mocked responses).
- **Acceptance Criteria:**
  - OpenAI API is called with correct payload
  - Agent reply is saved and sent
  - Test passes with OpenAI mocked
- **Recommended Approach:**
  - Unit test for the `callOpenAIGPT` helper with mocked axios/OpenAI

### 5. Core Test: Error Handling
- **Objective:** Simulate failures (Supabase/OpenAI down) and verify error logging and user notification.
- **Acceptance Criteria:**
  - Errors are logged
  - User receives a helpful error message via Telegram
  - Test passes for both Supabase and OpenAI failures
- **Recommended Approach:**
  - Integration tests with forced errors and assertion on user notification (**in progress**)

---

### Current Tasks

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

---

*Last updated: 2025-04-16*
