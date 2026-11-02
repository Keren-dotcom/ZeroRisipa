# ERD – ZeroRisipa

Database schema (ZER-2). GitHub and VS Code (with the *Markdown Preview Mermaid Support* extension) render the diagram directly.

```mermaid
erDiagram
    users ||--o{ pantry_items : "has in pantry"
    users |o--o{ ingredients : "owns (custom)"
    ingredients ||--o{ pantry_items : "is stored as"
    recipes ||--|{ recipe_ingredients : "contains"
    ingredients ||--o{ recipe_ingredients : "appears in"

    users {
        int id PK
        varchar email UK
        varchar hashed_password
        varchar full_name "optional"
        bool is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ingredients {
        int id PK
        varchar name "unique per catalogue"
        varchar category "e.g. dairy, vegetables"
        varchar default_unit "g, ml, pcs"
        int owner_id FK "NULL = shared catalogue"
        timestamptz created_at
        timestamptz updated_at
    }

    pantry_items {
        int id PK
        int user_id FK
        int ingredient_id FK
        numeric quantity "> 0"
        varchar unit
        date expiry_date "indexed"
        timestamptz created_at
        timestamptz updated_at
    }

    recipes {
        int id PK
        varchar name UK
        text description "optional"
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

## Decisions

- **`ingredients` is a shared catalogue plus per-user additions.** Rows with `owner_id` NULL are the shared catalogue (loaded by the seed); rows with `owner_id` set are a user's own ingredients, visible only to them. Pantries and recipes use the same table, so the optimization algorithm can match what is expiring directly against what recipes need. Recipes only use the shared catalogue.
- **Ingredient names** are stored lowercase and are unique within the shared catalogue and within each user's catalogue (two partial unique indexes). A user can't add a name that already exists in the shared catalogue.
- **`pantry_items.expiry_date` is indexed**, for the "what expires in the next N days" query.
- **Deletes:** deleting a user also deletes their pantry and their own ingredients; deleting a recipe also deletes its ingredient links. An ingredient that is in use somewhere cannot be deleted (`RESTRICT`).
- **Units:** each row has its own unit (`unit`); `default_unit` is only the suggestion for forms. Converting between units (g ↔ kg) is left to the algorithm task.
- **`recipe_ingredients`** has a composite primary key `(recipe_id, ingredient_id)`, so an ingredient appears only once per recipe.
