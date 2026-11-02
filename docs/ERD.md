# Diagrama ERD – ZeroRisipa

Schema bazei de date (ZER-2). GitHub și VS Code (cu extensia *Markdown Preview Mermaid Support*) afișează diagrama direct.

```mermaid
erDiagram
    users ||--o{ pantry_items : "are în cămară"
    ingredients ||--o{ pantry_items : "este stocat ca"
    recipes ||--|{ recipe_ingredients : "conține"
    ingredients ||--o{ recipe_ingredients : "apare în"

    users {
        int id PK
        varchar email UK
        varchar hashed_password
        varchar full_name "opțional"
        bool is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ingredients {
        int id PK
        varchar name UK
        varchar category "ex. lactate, legume"
        varchar default_unit "g, ml, buc"
        timestamptz created_at
        timestamptz updated_at
    }

    pantry_items {
        int id PK
        int user_id FK
        int ingredient_id FK
        numeric quantity "> 0"
        varchar unit
        date expiry_date "indexat"
        timestamptz created_at
        timestamptz updated_at
    }

    recipes {
        int id PK
        varchar name UK
        text description "opțional"
        text instructions
        int servings "> 0"
        int prep_time_minutes ">= 0"
        timestamptz created_at
        timestamptz updated_at
    }

    recipe_ingredients {
        int recipe_id PK,FK
        int ingredient_id PK,FK
        numeric quantity "> 0"
        varchar unit
    }
```

## Decizii

- **`ingredients` e un catalog comun.** Cămara și rețetele folosesc aceleași ingrediente, așa că algoritmul de optimizare poate potrivi direct ce expiră cu ce cer rețetele.
- **`pantry_items.expiry_date` are index**, pentru interogarea „ce expiră în următoarele N zile”.
- **Ștergeri:** dacă se șterge un utilizator, i se șterge și cămara; dacă se șterge o rețetă, i se șterg ingredientele asociate. Un ingredient folosit undeva nu poate fi șters (`RESTRICT`).
- **Unități:** fiecare rând are propria unitate (`unit`); `default_unit` e doar sugestia pentru formulare. Conversia între unități (g ↔ kg) rămâne pentru taskul algoritmului.
- **`recipe_ingredients`** are cheie primară compusă `(recipe_id, ingredient_id)`, deci un ingredient apare o singură dată într-o rețetă.
