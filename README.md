This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Comprehensive documentation and file structure:** See [DOC.md](./DOC.md)

## Personal Website

---

**Design Reference:**
See [`docs/multi_agent_cascade_protocol_design.md`](docs/multi_agent_cascade_protocol_design.md) for the full multi-agent Cascade protocol design, agent roles, and orchestration workflow. This is the canonical reference for architecture and implementation.

A Next.js-based personal website with Telegram, Supabase, and OpenAI (GPT-4.1, Whisper) integrations.

---

## Features
- Telegram webhook endpoint for automated messaging, file, and voice handling
- Supabase Storage integration for file uploads
- OpenAI GPT-4.1 for AI-powered responses
- Whisper API for voice transcription
- TypeScript, ESLint, Jest, Tailwind CSS

## Security

- Environment variables are used for all sensitive credentials (Supabase, OpenAI, Telegram, Whisper).
- User data is never logged or exposed in client-side code.
- Only approved domains and users can access the deployed endpoints.

## Agent Swarm Architecture

- This system is designed to be deployed as a swarm of agents, enabling scalable, collaborative, and distributed operation.
- It leverages [autogen 0.2](https://github.com/microsoft/autogen) and [LangChain](https://github.com/langchain-ai/langchain) to orchestrate and manage multiple agents working in parallel or in coordination.
- Each agent can be specialized for different tasks (e.g., Telegram handling, file management, voice transcription, etc.) and can communicate with other agents in the swarm.
- This architecture supports robust, modular, and extensible deployments for advanced automation and AI-driven workflows.

## Multi-Agent Orchestration & Messaging

## Telegram API Modularization

- The Telegram API handler logic is now modularized:
  - File handling, transcription, OpenAI, and DB operations are extracted to `utils/telegram/` helpers.
  - This keeps the API route handler under 200 lines and improves maintainability.

- The orchestrator supports launching, monitoring, and coordinating multiple agents (the "swarm") via the `spawnSwarm` method.
- Agents can send messages to each other using the `sendAgentMessage` and `getAgentMessages` APIs, enabling agent-to-agent communication and coordination.
- The full swarm state (agents and messages) can be inspected for debugging, monitoring, or visualization.
- All interfaces are type-safe and ready for extension with real distributed runtimes, autogen, or LangChain.
- Extension points for autogen/LangChain are clearly marked in the codebase for future integration.

## Reliability, Crash Recovery & User Notifications

- The system is designed to recover from crashes without losing state by using an external store for memory. This ensures that restarts do not wipe important context.
- Agents feature **automatic and manual recovery**: if an agent crashes, the orchestrator attempts auto-restart (with retries and cooldowns). Recovery status is tracked and exposed in the UI.
- **Health states** include: `pending`, `healthy`, `crashed`, `restarting`, `recovered`, and `recovery_failed` for robust orchestration and monitoring. All health states are type-safe and reflected in the UI and API responses.
- **UI notifications:** When an agent recovers, restarts, or recovery fails, a toast notification is shown to the user (color-coded for success/info/error). This provides instant, visible feedback on agent health.
- All agent status and notifications are type-safe and reflected in the UI and API responses.
- Periodic backups are implemented for any important data, including long-term conversation history or vector indexes, to prevent data loss.
- If the agent crashes or an external API fails, the system either retries the operation or responds to the user with an apology, rather than going silent.

See [DOC.md](./DOC.md) for full documentation of agent lifecycle, health states, and notification flow.

### Documentation Checklist
- After every major code or architecture change, update `README.md`, `DOC.md`, and `PLAN.md` to reflect the latest state of the system.
- As part of the PR checklist, verify that all documentation is up-to-date and includes:
  - Agent lifecycle and health state changes
  - Notification logic and user-facing feedback
  - Any new tickets or completed work in PLAN.md

## Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account and project
- Telegram Bot Token
- OpenAI API keys

### Environment Variables
Create a `.env` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
WHISPER_API_KEY=your_whisper_api_key
```

### Install Dependencies
```
npm install
```

### Development
```
npm run dev
```

### Linting & Formatting
```
npx next lint --fix
```

### Testing
```
npm test
```

#### Agent API Endpoint Testing

This project includes comprehensive integration tests for all agent API endpoints (e.g. `/api/agents`, `/api/agents/[id]`, `/api/agents/[id]/logs`).

- **Test files:**
  - `pages/api/agents/index.test.ts` — GET/POST agent list
  - `pages/api/agents/[id].test.ts` — GET/DELETE individual agent
  - `pages/api/agents/agentLogs.test.ts` — GET logs for running/stopped/missing agent

To run all API tests:
```
npx jest pages/api/agents/*.test.ts --detectOpenHandles --runInBand --verbose
```

**Troubleshooting:**
- If Jest reports `Cannot find module ...` for orchestrator or agentManager imports, check that the import path uses the correct number of `../` (should be `../../../src/orchestration/orchestratorSingleton` from the test file).
- If a test is not discovered, ensure the file is named with `.test.ts` and is not using brackets or special characters in a way that breaks glob patterns on Windows.
- If you add new endpoints, follow the existing test structure and add a corresponding `.test.ts` file in the same directory.

**Best practices:**
- Always clear the orchestrator/agent state before each test to avoid test pollution.
- Tests should reflect live, in-memory agent state as managed by the orchestrator singleton.
- See the test files for examples of mocking requests, orchestrator usage, and log assertions.

---

### Troubleshooting (Windows)
- **Path issues:** Use correct relative paths (e.g., `../../../src/...`) in imports. Windows path separators and glob patterns may break if brackets or special characters are in filenames.
- **Port conflicts:** If you see errors like `Port 3000 is in use`, kill all running Node/Next.js processes using Task Manager or `Get-Process node | Stop-Process` in PowerShell.
- **Jest test discovery:** Ensure test files are named `*.test.ts` and are not nested in folders with brackets or special characters.

For more, see [DOC.md](./DOC.md).

---

See the "API Error Response Format" section in [DOC.md](./DOC.md) for details on standard error handling and examples of error responses from all agent endpoints.

---

## API Usage Examples & Quickstart

### Example Requests (using `curl`)

- **List all agents:**
  ```sh
  curl -X GET http://localhost:3000/api/agents
  ```
- **Create an agent:**
  ```sh
  curl -X POST http://localhost:3000/api/agents \
    -H "Content-Type: application/json" \
    -d '{"type":"test","host":"localhost","config":{}}'
  ```
- **Get agent by ID:**
  ```sh
  curl -X GET http://localhost:3000/api/agents/<agentId>
  ```
- **Delete agent by ID:**
  ```sh
  curl -X DELETE http://localhost:3000/api/agents/<agentId>
  ```
- **Get agent logs:**
  ```sh
  curl -X GET http://localhost:3000/api/agents/<agentId>/logs
  ```
- **Restart agent:**
  ```sh
  curl -X POST http://localhost:3000/api/agents/<agentId>/restart
  ```
- **Get agent health:**
  ```sh
  curl -X GET http://localhost:3000/api/agents/<agentId>/health
  ```

### Postman Collection
- Import `postman_collection.json` (in the project root) into Postman for ready-to-use API requests.

### Quickstart Script
- To quickly spin up, test, and interact with the agent API, use the above curl examples or import the Postman collection.
- **Windows/PowerShell users:** Run the included `quickstart.ps1` script to automatically create an agent, fetch its details/logs/health, and delete it:
  ```powershell
  .\quickstart.ps1
  ```
  This script demonstrates the full agent API lifecycle.

---

## Dashboard UI: Real-Time Agent State

The dashboard provides rich, live feedback and error handling for agent operations:

### Health Status Color Coding
- **healthy:** green
- **recovered:** blue
- **pending:** orange
- **restarting:** purple
- **crashed:** red
- **recovery_failed:** dark red
- **unresponsive:** yellow

### Log Level Color Coding
- **info:** blue
- **warning:** orange
- **error:** red
- **debug:** green

### Toast Notifications
- Success, error, and warning events (e.g., agent started, stopped, or failed) are shown as color-coded toast notifications in the top-right corner.

### Real-Time Polling
- Agent health and logs are refreshed automatically every 2 seconds, so the UI always reflects the live state of each agent.

### Troubleshooting
- If the UI does not update or shows stale info, try refreshing the page.
- For persistent errors, check browser console logs and ensure the API server is running.
- All errors from API actions are surfaced in the UI as clear messages or toasts.

## Core Architecture
- **pages/api/telegram.ts**: Main API route for Telegram webhook
- **components/**: React components
- **utils/**: Utility functions
- **Supabase**: Used for storage and message history
- **OpenAI**: Used for chat and voice transcription

## Testing
- Uses Jest and @testing-library/react
- Add tests in `components/*.test.tsx` and for API logic
- See PLAN.md for key regression and integration tests

## Local Development & Telegram Bot Integration

### Fully Automated Telegram Bot Workflow

You can now launch your entire Telegram bot dev environment—including Next.js, ngrok, and webhook setup—with just two commands (or a single one-liner):

**Step 1: Start Next.js and ngrok**
```powershell
./start-dev.ps1
```
- Starts the dev server and ngrok, making your local API publicly accessible.

**Step 2: Automatically set the Telegram webhook**
```powershell
./set-telegram-webhook.ps1
```
- This script fetches the current ngrok public URL and sets your Telegram bot webhook to point to `/api/telegram`.
- The bot token is read automatically from the `.env` file (TELEGRAM_BOT_TOKEN). No need to pass it as a parameter!

**One-liner for full automation:**
```powershell
./start-dev.ps1; ./set-telegram-webhook.ps1
```

**Result:**
- Your Telegram bot is immediately ready for live conversation and testing with your local dev environment.
- You can send messages to your bot in Telegram and see responses routed through your local server.

**Troubleshooting:**
- Only one ngrok tunnel per account/session is allowed on free accounts. If you get an error, close other ngrok sessions or use the ngrok dashboard to terminate old tunnels.
- If you see "No HTTPS ngrok tunnel found. Is ngrok running?", ngrok may still be starting up. Wait a few seconds after running `./start-dev.ps1` before running `./set-telegram-webhook.ps1`.
- You can check ngrok's status and see the public URL at [http://127.0.0.1:4040](http://127.0.0.1:4040) in your browser.
- If your bot does not respond, make sure both scripts ran successfully and check that the webhook is set to the current ngrok URL.

## Deployment
- Deployable to Vercel, Netlify, or similar (see Next.js docs)

---

## License
MIT

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
