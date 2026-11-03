# Deploying ZeroRisipa

Everything runs on free plans:

| Part | Where | URL (default) |
|------|-------|---------------|
| Frontend (React static site) | Render static site | `https://zerorisipa.onrender.com` |
| API (FastAPI) | Render web service, free plan | `https://zerorisipa-api.onrender.com` |
| Database (PostgreSQL) | Neon, free plan | given by Neon |

The whole setup is described in [`render.yaml`](../render.yaml) at the repo root (a Render "Blueprint").
Every push to `main` redeploys both services automatically.

**Free plan limits worth knowing**

- The API sleeps after 15 minutes without traffic. The first request after that takes about a minute while it wakes up. Open the API URL a minute before a demo.
- Neon's free database does not expire (Render's own free Postgres is deleted after 30 days, which is why we use Neon).

## 1. Create the database (Neon)

1. Go to <https://neon.tech> and sign up with GitHub.
2. Create a project: name `zerorisipa`, Postgres 16 or newer, region **AWS Europe (Frankfurt)**.
3. On the project dashboard click **Connect**, keep the default branch/database, and copy the **connection string**. It looks like
   `postgresql://neondb_owner:xxxx@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private: it contains the password.

## 2. Deploy on Render

1. Go to <https://render.com> and sign up with GitHub.
2. Click **New** → **Blueprint**, connect GitHub if asked, and pick the `ZeroRisipa` repository (branch `main`).
3. Render reads `render.yaml` and shows two services. It asks for three values:
   - `DATABASE_URL` → the Neon connection string from step 1.
   - `CORS_ORIGINS` → `https://zerorisipa.onrender.com`
   - `VITE_API_BASE_URL` → `https://zerorisipa-api.onrender.com`
4. Click **Deploy Blueprint** and wait for both services to turn green (the first build takes a few minutes).
   On start the API runs the migrations and loads the starter recipes, so the database is ready by itself.

## 3. Check the URLs

Render uses the service name for the URL, but adds a suffix if the name is taken (e.g. `zerorisipa-ab12.onrender.com`).
Open each service in the Render dashboard and look at the URL at the top.

If a URL differs from the values you typed in step 2:

- API service → **Environment** → set `CORS_ORIGINS` to the real frontend URL (no trailing slash) → **Save changes**.
- Frontend service → **Environment** → set `VITE_API_BASE_URL` to the real API URL → **Save, rebuild and deploy**
  (Vite bakes this value in at build time, so the frontend must be rebuilt).

## 4. Test

1. Open `<API URL>/health` → it should answer with an OK status.
2. Open `<API URL>/docs` → the Swagger page of the API.
3. Open the frontend URL, register a user, log in, add pantry items.

If the frontend shows network errors, the browser console usually says "CORS": check that `CORS_ORIGINS` matches the frontend URL exactly.

## Several frontend URLs

`CORS_ORIGINS` takes a comma-separated list, e.g.
`https://zerorisipa.onrender.com,http://localhost:5173` lets both the deployed site and a local frontend call the deployed API.
