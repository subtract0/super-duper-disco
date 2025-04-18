# HandwerkerPro Documentation

## Documentation Policy
- After every major code or architecture change, you **must** update `README.md`, `DOC.md`, and `PLAN.md` to reflect the latest state of the system.
- As part of the PR checklist, verify that all documentation is up-to-date and includes:
  - Agent lifecycle and health state changes
  - Notification logic and user-facing feedback
  - Any new tickets or completed work in PLAN.md

## Overview
HandwerkerPro is a modern, production-ready Next.js application for managing craftsmen and contractor quoting in Germany. It features robust authentication (Supabase), error monitoring (Sentry), and a polished UI (Tailwind CSS).

---

## Tech Stack

### Backend / Orchestration
- **Node.js** with **TypeScript**: Main language for orchestration, agent management, and API logic.
- **In-memory singletons** for agent health, logs, and state (e.g., `agentManager`, `agentHealthStore`, `agentLogStore`).
- **Custom agent orchestration**: Agents run as background processes managed by the orchestrator and agent manager, with live health and lifecycle tracking.
- **API endpoints**: Implemented using Next.js API routes (e.g., `/api/agents`).

### Testing
- **Jest**: Primary test runner for both unit and integration tests.
- **node-mocks-http**: For mocking HTTP requests/responses in API tests.
- **Real and fake timers**: Used in orchestrator tests to simulate asynchronous agent recovery and lifecycle events.

### Frontend
- **React** (implied by `.tsx` test files and component structure).
- **Next.js**: Used for API routes and likely for SSR/SSG of the frontend.
- **Component tests**: Written for React components (e.g., `AgentRegistry.test.tsx`).

### Utilities / Integration
- **Supabase**: Used for some utility/database integration (`supabaseClient.ts`).
- **Postman collection**: Provided for API onboarding and testing.
- **PowerShell scripts**: For quickstart and setup tasks (`quickstart.ps1`).

### Documentation
- **Markdown docs**: `DOC.md` and inline documentation throughout the codebase.

---

## File Structure

```
/ (Project Root)
├── .env                  # Environment variables (not committed)
├── .gitignore            # Git ignore rules
├── .babelrc              # Babel config for Next.js & Jest
├── jest.config.js        # Jest configuration for tests
├── jest.setup.js         # Jest setup for Testing Library
├── next.config.js/ts     # Next.js configuration
├── package.json          # Project dependencies and scripts
├── README.md             # Project overview and quickstart
├── DOC.md                # (This file) Comprehensive documentation
├── supabase_schema.sql   # SQL for Supabase auth & multi-tenancy
├── app/                  # Next.js app directory (main UI, routing)
│   ├── globals.css       # Global styles (Tailwind base)
│   ├── page.tsx          # Landing page (with AuthForm)
│   └── ...
├── components/           # React components (AuthForm, etc.)
│   ├── AuthForm.tsx      # Auth logic (sign in/up)
│   ├── AuthForm.test.tsx # Tests for AuthForm
│   ├── SentryErrorBoundary.test.tsx # Sentry error boundary tests
│   └── ...
├── pages/                # (API routes, legacy Next.js)
│   └── api/
│       └── sentry-test-error.ts # Sentry test route
├── public/               # Static assets
├── utils/                # Utility code (supabaseClient, etc.)
│   ├── supabaseClient.ts # Supabase client
│   └── supabaseClient.test.ts # Tests for Supabase client
└── ...
```

---

## Agent Lifecycle, Health States & UI Notifications

### Agent Lifecycle
- Agents are launched, stopped, and can be automatically or manually restarted by the orchestrator.
- On crash, the orchestrator marks the agent as `crashed` and attempts auto-recovery with retries and cooldowns.
- Agents remain in the registry with their current status for full visibility and recovery.

### Health States
- `pending`: Agent is initializing
- `healthy`: Agent is running normally
- `crashed`: Agent has stopped unexpectedly
- `restarting`: Agent is in the process of being recovered
- `recovered`: Agent was successfully restarted
- `recovery_failed`: All recovery attempts failed

### Agent Log Format
Agent logs are structured as objects with the following fields:

```ts
{
  agentId: string;         // Unique agent ID
  timestamp: number;       // Unix timestamp (ms)
  level: 'info' | 'warn' | 'error';
  message: string;         // Log message
}
```

**Example:**
```json
{
  "agentId": "f9679359-b7c0-465d-aace-2efa58bc7d02",
  "timestamp": 1713380000000,
  "level": "info",
  "message": "Agent launched (type: test, host: localhost)"
}
```

### API Error Response Format
All agent API endpoints return errors in a consistent JSON format with the appropriate HTTP status code. Typical error responses:

- **400 Bad Request** (e.g., invalid agent ID):
  ```json
  { "error": "Invalid agent id (must be string)" }
  ```
- **404 Not Found** (e.g., agent not found):
  ```json
  { "error": "Agent not found" }
  ```
- **405 Method Not Allowed**:
  ```json
  { "error": "Method not allowed" }
  ```

Clients and tests should always check for an `error` field in non-200 responses.

### UI Notifications
- The Agent Registry UI displays toast notifications when an agent is auto-recovered, restarted, or recovery fails.
- Toasts are color-coded (success/info/error) and auto-dismiss after a few seconds.

---

## Dashboard UI: Real-Time Agent State

The dashboard provides:
- **Health status color-coding:**
    - healthy (green), recovered (blue), pending (orange), restarting (purple), crashed (red), recovery_failed (dark red), unresponsive (yellow)
- **Log level color-coding:**
    - info (blue), warning (orange), error (red), debug (green)
- **Toast notifications:**
    - Shown for agent lifecycle events and errors, color-coded by event type
- **Real-time polling:**
    - Health and logs are refreshed every 2s for live feedback
- **Troubleshooting:**
    - Refresh the page if UI is stale
    - Check browser console and API server status for persistent errors
    - All errors are surfaced in the UI as toasts or messages
    - If `/api/agents` hangs or fails to return, restart the dev server and check the terminal for errors. Inspect your agent orchestration code for infinite loops or blocking calls. The endpoint now returns partial results and error fields if any agent fails, so you should still see most agents even if some are broken.
- The UI reflects all health states for maximum transparency and user trust.

---

## Key Technologies
- **Next.js 15**: App router, SSR, API routes
- **Supabase**: Auth, multi-tenancy, email templates
- **Sentry**: Error monitoring, source maps
- **Tailwind CSS**: Modern, responsive UI
- **Jest + Testing Library**: Robust testing for all main functions

---

## Main Features
- User registration, login, and email verification (Supabase)
- Multi-tenancy via companies table (see `supabase_schema.sql`)
- Sentry error monitoring with source maps for production debug
- Modern, accessible UI with Tailwind
- Comprehensive automated tests for core logic

---

## Testing
- Run all tests: `npm test`
- Test files are in `components/` and `utils/`
- Jest and Testing Library are configured for React 19/Next.js

## Troubleshooting (Windows/Next.js)
- **Path issues:** Use correct relative import paths (e.g., `../../../src/...`). Avoid brackets/special characters in test file/folder names.
- **Port conflicts:** If you see errors like `Port 3000 is in use`, kill all Node/Next.js processes. Use Task Manager or `Get-Process node | Stop-Process` in PowerShell.
- **Jest test discovery:** Test files must be named `*.test.ts` and not nested in problematic folders.

---

## Deployment
- Production builds: `npm run build`
- Start server: `npm start`
- Sentry source maps are uploaded automatically on build

---

## Security
- Keep your `.env` file and Supabase/Sentry credentials secure
- Never commit secrets to version control

---

## Customization
- Supabase email templates: Edit in Supabase dashboard (see Authentication > Templates)
- UI: Modify Tailwind classes in components/app
- Add new features by extending app/components/utils

---

## For More Info
- See `README.md` for quickstart
- See `supabase_schema.sql` for database schema
- See this `DOC.md` for details
