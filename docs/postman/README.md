# Postman collection – ZeroRisipa API

Integration tests for the first deliverable: health, authentication, ingredients, pantry and recipes (23 requests, 41 checks).

## Import into Postman

1. Start the backend (see `backend/README.md`) and, optionally, run `python -m app.seed` so there are recipes.
2. In Postman: **Import** → pick the two files in this folder:
   - `ZeroRisipa.postman_collection.json` (the collection)
   - `ZeroRisipa.local.postman_environment.json` (the environment with `baseUrl = http://localhost:8000`)
3. In the top right, select the **ZeroRisipa local** environment.

## Running

- **The whole collection:** right-click the collection → **Run collection** → **Run ZeroRisipa API**. Every test should be green.
- **A single request:** run **Auth → Login** first. The token is saved automatically in the `token` variable, and protected requests use it on their own.

You can run the collection any number of times: each run creates a new user (`student_<timestamp>@example.com`) and a new ingredient, so it never clashes with existing data. If the database has no recipes (the seed wasn't run), the **Recipe detail** request is skipped.

## From the command line (optional)

With [Newman](https://www.npmjs.com/package/newman):

```bash
npx newman run docs/postman/ZeroRisipa.postman_collection.json \
  -e docs/postman/ZeroRisipa.local.postman_environment.json
```
