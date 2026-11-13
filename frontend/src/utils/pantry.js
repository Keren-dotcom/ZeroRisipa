// Helpers shared by the Pantry and Recipes pages.

export const EXPIRING_SOON_DAYS = 3;

// Whole days from today until the date (negative if already expired), by calendar day in local time
export function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${dateString}T00:00:00`) - today) / (1000 * 3600 * 24));
}

export function isExpiringSoon(dateString) {
  const days = daysUntil(dateString);
  return days >= 0 && days <= EXPIRING_SOON_DAYS;
}

// Map of ingredient name (lower case) -> the pantry item that expires first.
// Expired items are left out: they can't be used for cooking anymore.
export function indexPantry(items) {
  const byName = new Map();
  for (const item of items) {
    if (daysUntil(item.expiry_date) < 0) continue;
    const name = item.ingredient.name.toLowerCase();
    const current = byName.get(name);
    if (!current || item.expiry_date < current.expiry_date) byName.set(name, item);
  }
  return byName;
}

// Compares a recipe's ingredients with the pantry (by ingredient name).
export function matchRecipe(recipe, pantryByName) {
  const ingredients = recipe.ingredients.map((ri) => {
    const pantryItem = pantryByName.get(ri.ingredient.name.toLowerCase()) ?? null;
    let status = 'missing';
    if (pantryItem) status = isExpiringSoon(pantryItem.expiry_date) ? 'expiring' : 'have';
    return { ...ri, pantryItem, status };
  });
  return {
    ingredients,
    have: ingredients.filter((i) => i.status !== 'missing'),
    expiring: ingredients.filter((i) => i.status === 'expiring'),
    missing: ingredients.filter((i) => i.status === 'missing'),
  };
}
