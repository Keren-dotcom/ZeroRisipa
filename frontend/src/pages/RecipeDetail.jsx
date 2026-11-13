import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { daysUntil, indexPantry, matchRecipe } from '../utils/pantry';

const STATUS_STYLES = {
  expiring: 'text-error bg-error-container',
  have: 'text-on-secondary-container bg-secondary-container',
  missing: 'text-on-surface-variant bg-surface-container-high',
};

function statusLabel({ status, pantryItem }) {
  if (status === 'missing') return 'Missing';
  const days = daysUntil(pantryItem.expiry_date);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return status === 'expiring' ? `Expires ${when}` : 'In pantry';
}

export default function RecipeDetail() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipeRes, pantryRes] = await Promise.all([
          axiosClient.get(`/recipes/${id}`),
          axiosClient.get('/pantry'),
        ]);
        setRecipe(recipeRes.data);
        setMatch(matchRecipe(recipeRes.data, indexPantry(pantryRes.data)));
        setError('');
      } catch (err) {
        setError(err.response?.status === 404 ? 'Recipe not found.' : 'Failed to load the recipe.');
      }
    };
    fetchData();
  }, [id]);

  const steps = recipe?.instructions.split('\n').map((s) => s.trim()).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md py-margin-sm px-gutter-sm md:px-gutter">
      <div className="max-w-3xl mx-auto">
        <Link to="/recipes" className="text-label-md text-primary hover:underline">← All recipes</Link>

        {error && <div className="p-space-md mt-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>}

        {!recipe && !error && <div className="flex justify-center p-margin text-outline">Loading recipe...</div>}

        {recipe && match && (
          <>
            <header className="mt-space-md mb-space-lg">
              <h1 className="font-headline-xl text-headline-xl text-primary">{recipe.name}</h1>
              {recipe.description && <p className="text-body-md text-on-surface-variant mt-space-xs">{recipe.description}</p>}
              <p className="text-label-md text-on-surface-variant mt-space-sm">
                {recipe.prep_time_minutes} min · {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'} · you have {match.have.length} of {match.ingredients.length} ingredients
              </p>
            </header>

            <section className="bg-surface border border-outline-variant rounded-xl p-space-lg mb-space-lg">
              <h2 className="font-headline-md mb-space-md">Ingredients</h2>
              <ul className="flex flex-col gap-space-sm">
                {match.ingredients.map((item) => (
                  <li key={item.ingredient.id} className="flex justify-between items-center gap-space-sm">
                    <span>
                      <span className="font-semibold">{item.ingredient.name}</span>
                      <span className="text-on-surface-variant"> · {Number(item.quantity)} {item.unit}</span>
                    </span>
                    <span className={`text-label-sm px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[item.status]}`}>
                      {statusLabel(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-surface border border-outline-variant rounded-xl p-space-lg">
              <h2 className="font-headline-md mb-space-md">Instructions</h2>
              <ol className="flex flex-col gap-space-sm">
                {steps.map((step) => (
                  <li key={step} className="text-body-md">{step}</li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
