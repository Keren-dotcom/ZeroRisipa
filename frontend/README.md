# ZeroRisipa frontend

React + Vite + Tailwind CSS.

## Pages

- **Login** and **Sign up** (`/login`, `/register`)
- **Pantry** (`/pantry`): add, edit and delete food with quantity, unit and expiry date. Items are sorted by expiry date, and the ones that expire within 3 days are highlighted. The ingredient name field suggests names from the catalogue; if you type a name that isn't there, the ingredient is added to your own catalogue (`POST /ingredients`) when you save. Units: `pcs`, `g`, `kg`, `ml`, `clove`, `slice`.
- **Recipes** (`/recipes`): a placeholder for now.

Pantry and Recipes need you to be logged in; otherwise you are sent to `/login`.

## Structure

```
src/
├── api/axiosClient.js   # Axios instance for the backend
├── pages/               # one component per page
├── assets/              # images
├── App.jsx              # routes
└── main.jsx             # entry point
```

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
