import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { indexPantry, matchRecipe } from '../utils/pantry';

// Recipes that use the most ingredients expiring soon come first, then the ones you have most ingredients for
const byPantryMatch = (a, b) =>
  b.match.expiring.length - a.match.expiring.length ||
  b.match.have.length / b.match.ingredients.length - a.match.have.length / a.match.ingredients.length ||
  a.recipe.name.localeCompare(b.recipe.name);

export default function Recipes() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipesRes, pantryRes] = await Promise.all([
          axiosClient.get('/recipes', { params: { limit: 100 } }),
          axiosClient.get('/pantry'),
        ]);
        setRecipes(recipesRes.data.items);
        setPantryItems(pantryRes.data);
        setError('');
      } catch {
        setError('Failed to load recipes.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const rows = useMemo(() => {
    const pantryByName = indexPantry(pantryItems);
    const query = search.trim().toLowerCase();
    return recipes
      .filter((recipe) => !query || recipe.name.toLowerCase().includes(query))
      .map((recipe) => ({ recipe, match: matchRecipe(recipe, pantryByName) }))
      .sort(byPantryMatch);
  }, [recipes, pantryItems, search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md py-margin-sm px-gutter-sm md:px-gutter">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-space-xl">
        <h1 className="font-headline-xl text-headline-xl text-primary">Recipes</h1>
        <div className="flex gap-space-sm">
          <Link to="/pantry" className="px-space-md py-space-sm bg-primary text-on-primary rounded-full hover:bg-primary-container transition-colors font-label-md">
            My Pantry
          </Link>
          <button onClick={handleLogout} className="px-space-md py-space-sm bg-surface-container-low text-on-surface rounded-full hover:bg-surface-variant transition-colors font-label-md">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-sm mb-space-lg">
          <p className="text-body-md text-on-surface-variant">
            Recipes that use what expires soon in your pantry are shown first.
          </p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes"
            className="w-full sm:w-64 h-10 px-3 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]"
          />
        </div>

        {error && <div className="p-space-md mb-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>}

        {isLoading ? (
          <div className="flex justify-center p-margin text-outline">Loading recipes...</div>
        ) : rows.length === 0 ? (
          <div className="flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
            No recipes found.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {rows.map(({ recipe, match }) => (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className={`p-space-md rounded-xl border bg-surface flex flex-col gap-space-sm hover:shadow-md transition-shadow ${match.expiring.length ? 'border-error' : 'border-outline-variant'}`}
              >
                <div>
                  <h2 className="font-headline-sm text-on-surface">{recipe.name}</h2>
                  {recipe.description && <p className="text-body-sm text-on-surface-variant mt-1">{recipe.description}</p>}
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  {recipe.prep_time_minutes} min · {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                </p>

                <div className="mt-auto flex flex-col gap-1 pt-space-sm border-t border-surface-container-high">
                  <p className="text-label-md text-primary">
                    You have {match.have.length} of {match.ingredients.length} ingredients
                  </p>
                  {match.expiring.length > 0 && (
                    <p className="text-label-sm text-error bg-error-container px-2 py-0.5 rounded-full w-fit">
                      Uses expiring soon: {match.expiring.map((i) => i.ingredient.name).join(', ')}
                    </p>
                  )}
                  {match.missing.length > 0 && (
                    <p className="text-label-sm text-on-surface-variant">
                      Missing: {match.missing.map((i) => i.ingredient.name).join(', ')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
