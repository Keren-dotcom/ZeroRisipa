# ZeroRisipa frontend

React + Vite + Tailwind CSS. Pages: login, sign up, pantry (add / edit / delete food with expiry dates). Recipes is a placeholder for now.

## Prerequisites

- Node.js 20+ and npm
- The backend running on http://localhost:8000 (see `backend/README.md`), with the seed loaded so the ingredient list isn't empty

## Run locally

```bash
cd frontend
npm install
cp .env.example .env   # optional: only if the API isn't on http://localhost:8000
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). The backend already allows this origin for CORS.

## Other commands

- `npm run lint` checks the code with ESLint
- `npm run build` creates a production build in `dist/`

## How it talks to the API

`src/api/axiosClient.js` sets the base URL from `VITE_API_BASE_URL`, adds the JWT from `localStorage` to every request, and sends you back to `/login` when the API answers 401 (expired or invalid token).
