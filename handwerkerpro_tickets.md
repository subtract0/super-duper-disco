# HandwerkerPro – Development Tickets & Roadmap

This file contains the sequential development tickets for HandwerkerPro, a SaaS platform for craftsmen and contractors in Germany. Sentry integration is prioritized as the very first step to ensure robust error monitoring from the start. Each ticket includes an objective, acceptance criteria, a recommended technical approach, and a test outline. Use this file as a reference for ongoing and future development.

---

## Ticket 0: Sentry Integration & Error Monitoring
**Objective:** Integrate Sentry for error tracking and monitoring, ensuring that errors are logged and actionable in the Sentry dashboard, and that the system is ready for AI-assisted bugfixing.

**Acceptance Criteria:**
- Sentry SDK is installed and initialized in both client and server (Next.js) code.
- Errors thrown in the app are captured and visible in the Sentry dashboard.
- Sentry DSN is securely managed via environment variables.
- Sentry is configured to include useful context (user, route, etc.) in error logs.
- A test error can be triggered and is visible in Sentry.

**Technical Approach:**
- Install Sentry SDK for Next.js (`@sentry/nextjs`).
- Configure Sentry in `sentry.server.config.js` and `sentry.client.config.js`.
- Add Sentry DSN to `.env` and do not commit secrets.
- Add Sentry error boundary in React tree for client-side errors.
- Optionally, add custom error logging for key actions (e.g., failed payments, failed PDF export).

**Test Outline:**
- Trigger a test error in development and verify it appears in the Sentry dashboard.
- Throw an error in a React component and confirm the error boundary displays fallback UI and logs to Sentry.
- Simulate a server-side error and check Sentry logs it with route/user context.
- Remove or mask sensitive data from error payloads.

---

## Ticket 1: Project Setup & CI/CD
**Objective:** Scaffold the project with all dependencies, configure Supabase, Tailwind, shadcn/ui, React Query, and basic CI/CD.

**Acceptance Criteria:**
- Repo with working Next.js/React/TypeScript setup.
- Tailwind and shadcn/ui installed and demo component renders.
- Supabase client configured and .env in place.
- GitHub Actions workflow runs lint, build, and test.

**Technical Approach:**
- Use create-next-app, install dependencies, configure Tailwind, add shadcn/ui, set up Supabase client, add basic GitHub Actions workflow.

**Test Outline:**
- Run `npm run dev` and verify the app loads without errors and displays a styled component.
- Check that shadcn/ui and Tailwind classes render correctly on a test element.
- Confirm that `.env` variables are loaded and Supabase client initializes without error (mock/test connection).
- Push to GitHub and verify Actions run lint/build/test jobs and pass.

## Ticket 2: Auth & Multi-Tenancy
**Objective:** Implement Supabase Auth with email/password (and optionally Google), company/user link, and RLS.

**Acceptance Criteria:**
- Users can register/login (email/password, Google optional for MVP).
- Company created on registration, user assigned admin role.
- RLS policies: users see only their company data.
- Invite flow for new team members (MVP+).

**Technical Approach:**
- Supabase Auth, profiles/companies tables, RLS, React UI for login/register, role logic.

**Test Outline:**
- Register a new user, verify account is created and session is established.
- Login with correct and incorrect credentials, check error handling.
- Logout and verify protected pages redirect to login.
- Confirm RLS prevents access to other users' company data (manual or automated DB test).
- (If Google login enabled) Test OAuth flow end-to-end.

## Ticket 3: Customer CRM Module
**Objective:** CRUD for customers, company-linked, with offer history.

**Acceptance Criteria:**
- Add/edit/delete customers.
- List/search customers.
- View offer history per customer.

**Technical Approach:**
- Supabase customers table, RLS, React CRUD UI, offer/customer DB join.

**Test Outline:**
- Add a customer and verify it appears in the list.
- Edit a customer's details and confirm changes persist.
- Delete a customer and ensure it's removed from the UI and DB.
- Search/filter customers and check results.
- Attempt to access another user's customers (should be prevented by RLS).
- View offer history for a customer and verify correct linkage.

## Ticket 4: Quote Wizard (Multi-Step)
**Objective:** Multi-step form for quote creation: customer, project, positions, summary.

**Acceptance Criteria:**
- Stepper UI, validation, autosave.
- Position selection with price DB, quality levels.
- Real-time calculation of totals, VAT.
- Save as draft/complete.

**Technical Approach:**
- React Hook Form, shadcn/ui, React Query, Supabase offers/offer_items tables.

**Test Outline:**
- Complete the quote wizard and verify a quote is saved with all details.
- Test validation: try to submit with missing required fields and expect error messages.
- Autosave: refresh mid-process and confirm data is restored.
- Select a position from the price DB and check that price/quality is applied.
- Change line items and verify total/VAT updates in real time.
- Save as draft and as complete; confirm correct status in DB.

## Ticket 5: Price Catalog Module
**Objective:** Manage catalog of services/materials per company/trade with quality/price options.

**Acceptance Criteria:**
- CRUD for catalog items.
- Use in quote wizard.

**Technical Approach:**
- Supabase items table, RLS, React CRUD UI, integration with wizard.

**Test Outline:**
- Add, edit, and delete catalog items; verify list updates accordingly.
- Use a catalog item in the quote wizard and confirm correct data transfer.
- Attempt to access another user's catalog items (should be prevented by RLS).
- Validate price/quality options are selectable and persist as expected.

## Ticket 6: Dashboard & Realtime
**Objective:** KPI dashboard with charts, offer stats, activity feed, realtime updates.

**Acceptance Criteria:**
- Charts for offer status, revenue, activity.
- Realtime updates on offer changes.

**Technical Approach:**
- React Query, Chart.js/Recharts, Supabase views/RPC, Realtime subscriptions.

**Test Outline:**
- Load dashboard and verify metrics match DB data.
- Add/update offers and confirm charts/activity feed update in real time.
- Simulate DB changes and check UI reflects updates without manual reload.
- Test responsiveness and accessibility of dashboard components.

## Ticket 7: PDF Export & Monetization
**Objective:** Server-side PDF generation, first export free, then Stripe payment required (MVP: Stripe only).

**Acceptance Criteria:**
- Edge Function for PDF, stores in Supabase Storage.
- Free export tracked, payment required after first.
- Stripe integration, payment gating.

**Technical Approach:**
- Supabase Edge Functions (Deno), pdfkit, Stripe API, DB flag for free export.

**Test Outline:**
- Export a quote as PDF and verify file is generated and stored.
- Track free export in DB; after first export, ensure payment is required.
- Complete a Stripe payment and confirm subsequent PDF exports are unlocked.
- Attempt export without payment after free quota—expect payment prompt/block.
- Check error handling for failed exports or payment errors.

## Ticket 8: Company Settings
**Objective:** UI for company logo, VAT, payment, bank, offer templates.

**Acceptance Criteria:**
- Upload logo, edit VAT, payment terms, etc.
- Data saved per company, used in quotes/PDF.

**Technical Approach:**
- Supabase storage, settings table, React UI.

**Test Outline:**
- Upload a logo and verify it appears in the UI and is stored in Supabase Storage.
- Edit VAT/payment/bank details and confirm persistence and correct usage in quote/PDF.
- Attempt to access/edit another company's settings (should be prevented by RLS).
- Validate error handling for failed uploads or saves.

## Ticket 9: Polish, Testing, and Deployment
**Objective:** End-to-end tests, accessibility, responsive design, deployment.

**Acceptance Criteria:**
- All core flows tested.
- CI/CD passes.
- Deployed to Vercel/Netlify.

**Technical Approach:**
- Playwright/Cypress, Lighthouse, GitHub Actions, deployment config.

**Test Outline:**
- Run Playwright/Cypress E2E tests for all major user flows (auth, CRUD, PDF export, payment).
- Run Lighthouse and fix accessibility/responsiveness issues.
- Push to GitHub and verify CI/CD pipeline passes.
- Deploy to Vercel and confirm live app is functional.
