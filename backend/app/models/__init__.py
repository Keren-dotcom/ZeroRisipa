# Importă aici toate modelele, ca Alembic să le vadă la autogenerate.
from app.db.base import Base  # noqa: F401
from app.models.ingredient import Ingredient  # noqa: F401
from app.models.pantry_item import PantryItem  # noqa: F401
from app.models.recipe import Recipe, RecipeIngredient  # noqa: F401
from app.models.user import User  # noqa: F401
