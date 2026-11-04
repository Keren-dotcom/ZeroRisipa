# Deploying ZeroRisipa

Everything runs on free plans:

| Part | Where | URL (default) |
|------|-------|---------------|
| Frontend (React + Vite) | Vercel, Hobby plan | `https://zerorisipa.vercel.app` |
| API (FastAPI) | Render web service, free plan | `https://zerorisipa-api.onrender.com` |
| Database (PostgreSQL) | Neon, free plan | given by Neon |

How it fits together: the browser loads the site from Vercel. The site calls the API on Render
(the address is baked in at build time through `VITE_API_BASE_URL`). The API talks to the Neon
database through `DATABASE_URL`, and only accepts browser calls from the origins in `CORS_ORIGINS`.

Config files: [`render.yaml`](../render.yaml) (Render Blueprint for the API) and
[`frontend/vercel.json`](../frontend/vercel.json) (sends every path to `index.html` so React Router URLs work on refresh).
Every push to `main` redeploys both automatically.

**Free plan limits worth knowing**

- The API sleeps after 15 minutes without traffic. The first request after that takes about a minute while it wakes up. Open the site a minute before a demo.
- Neon's free database does not expire (Render's own free Postgres is deleted after 30 days, which is why we use Neon).
- Vercel's Hobby plan is for non-commercial use, which fits a university project.

## 1. Database (Neon)

1. Go to <https://neon.tech> and sign up with GitHub.
2. Create a project: name `zerorisipa`, region **AWS Europe (Frankfurt)**.
3. Click **Connect** and copy the **connection string**, e.g.
   `postgresql://neondb_owner:xxxx@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Keep it private: it contains the password.

## 2. API (Render)

1. Go to <https://render.com> and sign up with GitHub.
2. **New** → **Blueprint**, pick the `ZeroRisipa` repository (branch `main`).
3. Render asks for two values:
   - `DATABASE_URL` → the Neon connection string.
   - `CORS_ORIGINS` → `https://zerorisipa.vercel.app` (you can fix it in step 4 if Vercel gives another URL).
4. **Deploy Blueprint** and wait until the service is green. On start it runs the migrations and loads the starter recipes.
5. Copy the service URL from the top of its page (e.g. `https://zerorisipa-api.onrender.com`) and open `<URL>/health` to check it answers.

## 3. Frontend (Vercel)

1. Go to <https://vercel.com> and sign up with GitHub.
2. **Add New** → **Project**, import the `ZeroRisipa` repository.
3. Set **Root Directory** to `frontend`. Vercel detects Vite by itself (build `npm run build`, output `dist`).
4. Under **Environment Variables** add `VITE_API_BASE_URL` = the Render API URL from step 2 (no trailing slash).
5. **Deploy**. When it finishes, Vercel shows the site URL (e.g. `https://zerorisipa.vercel.app`).

## 4. Connect the two

If the Vercel URL differs from what you put in `CORS_ORIGINS`: Render → the API service → **Environment** →
set `CORS_ORIGINS` to the exact Vercel URL (no trailing slash) → **Save changes**.

If you later change `VITE_API_BASE_URL` on Vercel, redeploy the frontend (**Deployments** → **Redeploy**), because Vite bakes the value in at build time.

## 5. Test

Open the Vercel URL, register a user, log in, add pantry items. If you see network errors and the browser console mentions "CORS",
`CORS_ORIGINS` does not match the site URL exactly.

`CORS_ORIGINS` takes a comma-separated list, e.g. `https://zerorisipa.vercel.app,http://localhost:5173`
lets both the deployed site and a local frontend call the deployed API.
