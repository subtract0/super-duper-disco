# Testing Department Guidelines

> **See Also:**
> - [PLAN.md](./PLAN.md) — Project state, roadmap, and backlog
> - [start-dev.ps1](./start-dev.ps1) — Environment setup and project startup

This document consolidates best practices, patterns, and insights gathered while working in the Testing Department for this project. It covers unit testing, integration testing, end-to-end testing, mocking strategies, reliability tips, and project-specific notes.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Organization](#test-organization)
- [Unit Tests](#unit-tests)
- [Integration and API Tests](#integration-and-api-tests)
- [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [Mocking and Isolation](#mocking-and-isolation)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Environment Configuration](#environment-configuration)
- [Running Tests](#running-tests)
- [Continuous Integration](#continuous-integration)
- [Common Pitfalls](#common-pitfalls)

---

## Testing Philosophy

- Ensure tests reflect actual user behavior and critical functionality.
- Prioritize reliability and clarity over coverage vanity.
- Avoid flaky tests by using explicit waits (`waitFor`, `findBy`) and precise queries.
- Maintain separation between test concerns: do not mock beyond dev/test boundaries.

## Test Organization

- Place unit tests alongside modules (`*.test.ts`) or under `tests/` by domain (e.g. `tests/api`).
- Use descriptive test names: `it('should ...', ...)`.
- Skip or quarantine flaky tests with `test.skip` and add a clear TODO.
- Keep individual test files under 200 lines; split long suites.

## Unit Tests

- Use Jest with `@testing-library/jest-dom` for DOM assertions.
- For pure functions, assert return values and thrown errors.
- Write tests for all major branches: success, failure, edge values.

- Example patterns:

  ```ts
  expect(fn(args)).toEqual(expected);
  await expect(asyncFn()).rejects.toThrow(/error message/);
  ```


## Integration and API Tests

- Use `node-mocks-http` to simulate Next.js API handlers.
- Inject mocks for external clients (Supabase, Axios) via parameters.
- Always mock network calls:
  - `jest.mock('@supabase/supabase-js')` + `supabase.createClient.mockReturnValue(...)`.
  - `jest.mock('axios')` for HTTP endpoints.
- Validate both HTTP response code and JSON payload.
- Assert side-effects: e.g., `expect(axios.post).toHaveBeenCalledWith('/sendMessage', ...)`.

## End-to-End (E2E) Tests

- Use React Testing Library for component interactions.
- Avoid ambiguous queries: prefer `findByText`, `findByRole`, or `getAllByText`.
- Use `waitFor` to await asynchronous UI updates before assertions.

- Example shuffle test refinement:

  ```ts
  const btn = await screen.findByText(/Shuffle Cards/);
  fireEvent.click(btn);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  ```


## Mocking and Isolation

- Mock only external dependencies; keep in-memory state real where possible.
- Reset mocks in `afterEach`/`beforeEach`: `jest.resetAllMocks()`.
- Do not mock database in dev/prod code, only in tests.

## Error Handling and Edge Cases

- Write tests for failed network calls, invalid JSON, missing parameters.
- Ensure API handlers return consistent shapes: `{ ok: boolean, error?: string }`.
- Use `test.skip` for nondeterministic flows and address later.

## Environment Configuration

- Use dummy env vars in tests:

  ```js
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://...';
  process.env.TELEGRAM_BOT_TOKEN = 'dummy';
  process.env.OPENAI_API_KEY = 'dummy';
  ```

- Never overwrite `.env` without confirmation.

## Running Tests

- Run all with `npm test` or `npx jest`.
- For specific suites: `npm test -- __tests__/suiteName.test.tsx`.
- Use `--runInBand` for serial execution when debugging.

## Continuous Integration

- Integrate tests in CI pipeline; fail fast on errors.
- Kill previous server instances before starting new ones (avoid port conflicts).
- Include linting (`npm run lint`) and type checking.

## Common Pitfalls

- Forgetting to import `axios` or other modules in utility files.
- Overlooking `await` in E2E tests leading to race conditions.
- Mixing dev/prod mocks with real services.

---

*Document last updated: 2025-04-18*
