# Colecția Postman – ZeroRisipa API

Teste de integrare pentru primul livrabil: health, autentificare, ingrediente, cămară și rețete (22 de request-uri, 37 de verificări).

## Import în Postman

1. Pornește backend-ul (vezi `backend/README.md`) și, opțional, rulează `python -m app.seed` ca să ai rețete.
2. În Postman: **Import** → alege cele două fișiere din acest folder:
   - `ZeroRisipa.postman_collection.json` (colecția)
   - `ZeroRisipa.local.postman_environment.json` (environment-ul cu `baseUrl = http://localhost:8000`)
3. Sus în dreapta, selectează environment-ul **ZeroRisipa local**.

## Rulare

- **Toată colecția:** click dreapta pe colecție → **Run collection** → **Run ZeroRisipa API**. Toate testele trebuie să fie verzi.
- **Un singur request:** rulează întâi **Auth → Login**. Tokenul se salvează automat în variabila `token`, iar request-urile protejate îl folosesc singure.

Colecția poate fi rulată de oricâte ori: la fiecare rulare își creează un utilizator nou (`student_<timestamp>@example.com`) și un ingredient nou, deci nu se lovește de date existente. Dacă baza nu are rețete (seed-ul nu a fost rulat), request-ul **Detaliu rețetă** se sare.

## Din linia de comandă (opțional)

Cu [Newman](https://www.npmjs.com/package/newman):

```bash
npx newman run docs/postman/ZeroRisipa.postman_collection.json \
  -e docs/postman/ZeroRisipa.local.postman_environment.json
```
