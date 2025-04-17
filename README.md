This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Comprehensive documentation and file structure:** See [DOC.md](./DOC.md)

## Personal Website

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
