# HandwerkerPro Documentation

## Overview
HandwerkerPro is a modern, production-ready Next.js application for managing craftsmen and contractor quoting in Germany. It features robust authentication (Supabase), error monitoring (Sentry), and a polished UI (Tailwind CSS).

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

### UI Notifications
- The Agent Registry UI displays toast notifications when an agent is auto-recovered, restarted, or recovery fails.
- Toasts are color-coded (success/info/error) and auto-dismiss after a few seconds.
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
