# End-to-end tests (SMS-38)

Playwright tests that drive the real app (browser, API and database) through the key flows:
register and log in, create and publish a survey, take it as a logged-out respondent,
access control, and (once SMS-29 exists) the results page.

## Run locally

1. Start the database and API from the project root:
   `docker compose up -d db`, then `cd backend && npm run start:dev`.
2. In `frontend`, install the browsers once: `npx playwright install`.
3. Run the tests: `npm run e2e` (all browsers), or `npx playwright test --project=chromium`.
   The frontend dev server starts by itself.
4. Open the report after a failure: `npx playwright show-report`.

## Run against staging

Set `E2E_BASE_URL` (frontend address) and `E2E_API_URL` (API address), then run `npx playwright test`.
In GitHub this is `.github/workflows/e2e.yml`, which uses the `WEB_URL` and `API_URL` variables.

## Notes

- Each run creates fresh accounts with unique emails, so tests do not clash with old data.
- The results test skips itself while `GET /surveys/:id/results` returns 404 and turns on by itself once it exists.
- Projects: `chromium`, `firefox`, `webkit` (closest to Safari) and `mobile` (360 px wide).
