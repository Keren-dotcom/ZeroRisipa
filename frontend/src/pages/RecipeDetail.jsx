import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import NavBar from './NavBar';

// ---------- load + normalize the recipe from the database ----------

// GET /recipes/:id, falling back to the list if that route doesn't exist
const requestRecipe = async (id) => {
    try {
        const { data } = await axiosClient.get(`/recipes/${id}`);
        return data;
    } catch (err) {
        if (err.response?.status !== 404) throw err;
        const { data } = await axiosClient.get('/recipes', { params: { limit: 100 } });
        const found = (data.items ?? data).find((r) => String(r.id) === String(id));
        if (!found) throw err;
        return found;
    }
};

// Accepts several shapes, because the exact fields of the Recipe model are not known yet.
// Check the console log below and adjust this function if something shows up empty.
const normalizeRecipe = (raw) => {
    const r = raw.recipe ?? raw;

    const steps = Array.isArray(r.steps)
        ? r.steps.map((s) => (typeof s === 'string' ? s : s.description ?? s.text ?? s.instruction ?? ''))
        : String(r.steps ?? r.instructions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

    const ingredients = (r.ingredients ?? r.recipe_ingredients ?? []).map((i) => {
        const through = i.RecipeIngredient ?? i.recipe_ingredient ?? {};
        return {
            ingredient_id: i.ingredient_id ?? i.ingredient?.id ?? (i.name ? i.id : undefined),
            name: i.name ?? i.ingredient?.name ?? '',
            quantity: Number(i.quantity ?? through.quantity ?? 0),
            unit: i.unit ?? through.unit ?? i.default_unit ?? i.ingredient?.default_unit ?? '',
        };
    });

    return {
        id: r.id,
        title: r.title ?? r.name,
        description: r.description ?? '',
        prep: Number(r.prep_time_minutes ?? r.prep_time ?? 0) || 0,
        cook: Number(r.cook_time_minutes ?? r.cook_time ?? 0) || 0,
        steps,
        ingredients,
    };
};

// ---------- compare with the pantry ----------

// kg and g can be compared; the other units only with themselves
const toBase = (quantity, unit) =>
    unit === 'kg' ? { quantity: quantity * 1000, unit: 'g' } : { quantity, unit };

const round = (n) => Math.round(n * 100) / 100;

// Returns { status: 'ok' | 'partial' | 'missing', short?, unit? }
function checkIngredient(need, pantryItems) {
    const owned = pantryItems.filter((item) => {
        const itemId = item.ingredient?.id ?? item.ingredient_id;
        if (need.ingredient_id != null && itemId != null) return itemId === need.ingredient_id;
        return item.ingredient?.name.trim().toLowerCase() === need.name.trim().toLowerCase();
    });
    if (owned.length === 0) return { status: 'missing', short: need.quantity, unit: need.unit };

    const target = toBase(need.quantity, need.unit);
    // The same ingredient can be in the pantry several times (different expiry dates)
    const comparable = owned
        .map((item) => toBase(Number(item.quantity), item.unit))
        .filter((q) => q.unit === target.unit);

    if (comparable.length === 0) return { status: 'ok' }; // different units: having it is enough
    const have = comparable.reduce((sum, q) => sum + q.quantity, 0);
    if (have >= target.quantity) return { status: 'ok' };
    return { status: 'partial', short: target.quantity - have, unit: target.unit };
}

// ---------- page ----------

export default function RecipeDetail() {
    const { id } = useParams();

    const [recipe, setRecipe] = useState(null);
    const [pantryItems, setPantryItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        Promise.all([requestRecipe(id), axiosClient.get('/pantry')])
            .then(([recipeData, pantryRes]) => {
                if (cancelled) return;
                console.log('recipe from the backend ->', recipeData); // check this in the console (F12)
                setRecipe(normalizeRecipe(recipeData));
                setPantryItems(pantryRes.data);
            })
            .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Failed to load this recipe.')); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [id]);

    const checks = recipe ? recipe.ingredients.map((ing) => ({ ing, ...checkIngredient(ing, pantryItems) })) : [];
    const missing = checks.filter((c) => c.status !== 'ok');

    return (
        <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md">
            <NavBar />

            <main className="max-w-5xl mx-auto px-gutter-sm md:px-gutter pb-margin">
                <Link to="/recipes" className="inline-block mt-space-lg text-primary font-label-md hover:underline">
                    Back to recipes
                </Link>

                {error && <div className="p-space-md mt-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>}
                {isLoading && <p className="mt-space-lg text-outline">Loading recipe...</p>}

                {recipe && (
                    <>
                        <header className="py-space-md">
                            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-space-sm">{recipe.title}</h1>
                            <p className="max-w-lg text-on-surface-variant">{recipe.description}</p>
                            <div className="flex flex-wrap gap-space-sm mt-space-md">
                                <span className="px-space-md py-1 rounded-full border border-outline-variant text-label-sm">Prep: {recipe.prep} min</span>
                                <span className="px-space-md py-1 rounded-full border border-outline-variant text-label-sm">
                                    Cook: {recipe.cook === 0 ? 'no cooking' : `${recipe.cook} min`}
                                </span>
                                <span className="px-space-md py-1 rounded-full bg-primary text-on-primary text-label-sm">
                                    Total time: {recipe.prep + recipe.cook} min
                                </span>
                            </div>
                        </header>

                        <div className="grid md:grid-cols-2 gap-space-md mt-space-md">
                            <section className="p-space-lg rounded-xl border border-outline-variant">
                                <h2 className="font-headline-md mb-space-md">Ingredients you need</h2>
                                <ul className="flex flex-col gap-space-sm">
                                    {checks.map(({ ing, status }) => (
                                        <li
                                            key={ing.ingredient_id ?? ing.name}
                                            className={`flex justify-between items-center px-3 py-2 rounded-lg text-body-sm ${status === 'ok' ? 'bg-surface-container-low' : 'bg-error-container text-on-error-container'
                                                }`}
                                        >
                                            <span>{ing.name} · {ing.quantity} {ing.unit}</span>
                                            <span className="text-label-sm font-semibold">
                                                {status === 'ok' ? 'In your pantry' : status === 'partial' ? 'Not enough' : 'Missing'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="p-space-lg rounded-xl border border-outline-variant">
                                <h2 className="font-headline-md mb-space-md">Missing ingredients</h2>
                                {missing.length === 0 ? (
                                    <p className="text-on-surface-variant">You have everything you need for this recipe.</p>
                                ) : (
                                    <ul className="flex flex-col gap-space-sm">
                                        {missing.map(({ ing, status, short, unit }) => (
                                            <li key={ing.ingredient_id ?? ing.name} className="flex justify-between items-center px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm">
                                                <span>{ing.name}</span>
                                                <span className="text-label-sm font-semibold">
                                                    {status === 'partial' ? `Need ${round(short)} ${unit} more` : `Need ${round(short)} ${unit}`}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="md:col-span-2 p-space-lg rounded-xl border border-outline-variant">
                                <h2 className="font-headline-md mb-space-md">How to make it</h2>
                                <ol className="list-decimal pl-6 flex flex-col gap-space-sm marker:text-primary marker:font-semibold">
                                    {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                            </section>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}