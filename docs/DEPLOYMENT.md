# Deploying to Render (staging and production)

The CD workflow (`.github/workflows/cd.yml`) runs after CI succeeds on `main`. It builds the
Docker images, then asks Render to deploy by calling each service's **deploy hook**, and
finally runs `scripts/smoke-test.sh`. This guide sets that up once. Do it for **staging**
first; production is the same with its own services.

## 1. Create the services on Render

Sign in at <https://render.com> with GitHub. The repository is public, so it can be used
directly (*New → Web Service → Public Git Repository*, paste the repo URL).

### Database

*New → Postgres*, Free plan. Free Render databases are deleted 30 days after creation, which
is fine for the demo but not for real data. Keep its **Info** page open: you need the
hostname, port, database, username and password of the **internal** connection.

### Backend (`sms-api`)

*New → Web Service*, same region as the database.

| Field | Value |
|---|---|
| Language | Docker |
| Root Directory | `backend` |
| Health Check Path | `/health` |

Environment variables:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | from the database's internal connection |
| `JWT_SECRET` | a long random string (the server will not start without it in production) |
| `FRONTEND_ORIGIN` | the frontend address, e.g. `https://sms-web.onrender.com` |
| `TRUST_PROXY` | `true`, so the rate limits (SMS-34) see each visitor's IP (see note below) |

Optional: `HCAPTCHA_SECRET` (SMS-34), `RATE_LIMIT_ENABLED=false` on staging if the end-to-end
tests hit HTTP 429.

The database tables are created automatically on the first start (migrations run at start-up).

### Frontend (`sms-web`)

*New → Web Service*.

| Field | Value |
|---|---|
| Language | Docker |
| Root Directory | `frontend` |

Environment variables:

| Name | Value |
|---|---|
| `BACKEND_URL` | the backend address, e.g. `https://sms-api.onrender.com` |
| `PORT` | `80` (the frontend's nginx listens on port 80) |

**Use `BACKEND_URL`, not `API_URL`.** Each Render service gets its own `*.onrender.com`
address, and browsers treat those as different sites, so they would not send the login
cookie to the backend (you would be logged out on every refresh). With `BACKEND_URL` the
frontend's nginx forwards `/api/...` to the backend and the browser only talks to one site.
`API_URL` is only for setups where frontend and backend share a site, e.g.
`app.example.com` and `api.example.com`.

Optional: `VITE_HCAPTCHA_SITE_KEY` only works at build time; leave it out unless you also
enable hCaptcha in the image build.

### Deploy hooks

On each of the two web services: *Settings → Deploy Hook*, copy the URL. Treat it as a
password: anyone with it can trigger a deploy.

Turn off **Auto-Deploy** on both services (*Settings → Build & Deploy*), so they only
deploy when CD calls the hook, i.e. after CI has passed.

## 2. Tell GitHub about them

Repository *Settings → Environments → staging* (create it if it does not exist).
Only the repository owner/admin can do this.

| Kind | Name | Value |
|---|---|---|
| Environment secret | `BACKEND_DEPLOY_HOOK` | backend deploy hook URL |
| Environment secret | `FRONTEND_DEPLOY_HOOK` | frontend deploy hook URL |
| Environment variable | `API_URL` | backend address, e.g. `https://sms-api.onrender.com` (used by the smoke test for `/health`) |
| Environment variable | `WEB_URL` | frontend address, e.g. `https://sms-web.onrender.com` |

Repeat for the **production** environment with the production services.

## 3. Deploy

*Actions → CD → Run workflow* (or merge anything to `main`). If a setting is missing, the
*Check the staging settings* step says exactly which one.

Free Render services sleep after 15 minutes without traffic, so the first request after a
pause takes a while; the smoke test waits up to 5 minutes.

## Notes

- **Rate limits behind Render.** `TRUST_PROXY=true` makes the limits count per visitor, but
  a visitor could fake their address with an `X-Forwarded-For` header. Fine for the demo;
  for production, set `TRUST_PROXY` to the exact number of proxies in front of the backend.
- **End-to-end tests against staging** (`e2e.yml`) use the same `WEB_URL` and `API_URL`
  environment variables; nothing extra to set.
- **Local development is unchanged**: `npm run dev` in both folders; the frontend calls
  `localhost:3000`.
