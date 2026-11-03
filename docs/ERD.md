# ERD – ZeroRisipa

Database schema (ZER-2). GitHub and VS Code (with the *Markdown Preview Mermaid Support* extension) render the diagram directly.

```mermaid
erDiagram
    users ||--o{ pantry_items : "has in pantry"
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
        varchar name UK
        varchar category "e.g. dairy, vegetables"
        varchar default_unit "g, ml, pcs"
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

- **`ingredients` is a shared catalogue.** Pantries and recipes use the same ingredients, so the optimization algorithm can match what is expiring directly against what recipes need.
- **`pantry_items.expiry_date` is indexed**, for the "what expires in the next N days" query.
- **Deletes:** deleting a user also deletes their pantry; deleting a recipe also deletes its ingredient links. An ingredient that is in use somewhere cannot be deleted (`RESTRICT`).
- **Units:** each row has its own unit (`unit`); `default_unit` is only the suggestion for forms. Converting between units (g ↔ kg) is left to the algorithm task.
- **`recipe_ingredients`** has a composite primary key `(recipe_id, ingredient_id)`, so an ingredient appears only once per recipe.
