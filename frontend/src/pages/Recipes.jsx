import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import NavBar from './NavBar';

// Both return { items: [...], ttl_minutes }, with the pinned recipes first
const requestCurrent = () => axiosClient.get('/recipes/current').then((res) => res.data);
const requestGenerate = () => axiosClient.post('/recipes/generate').then((res) => res.data);

// Converts a value to a number (the API may send "10" as a string or Decimal); anything invalid becomes 0
const toMinutes = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

// Reads the first field name that exists, so a different naming (prepTime, prep_time...) still works
const prepTime = (recipe) =>
    toMinutes(recipe.prep_time_minutes ?? recipe.prep_time ?? recipe.prepTime ?? recipe.prep_time_min);
const cookTime = (recipe) =>
    toMinutes(recipe.cook_time_minutes ?? recipe.cook_time ?? recipe.cookTime ?? recipe.cook_time_min);
const totalTime = (recipe) => prepTime(recipe) + cookTime(recipe);

export default function Recipes() {
    const [recipes, setRecipes] = useState([]);
    const [ttlMinutes, setTtlMinutes] = useState(15);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [pinningId, setPinningId] = useState(null);
    const [error, setError] = useState('');

    const applyData = (data) => {
        setRecipes(data.items);
        setTtlMinutes(data.ttl_minutes);
    };

    // When the page opens, show the pinned recipes and the ones generated in the last 15 minutes.
    // State is only set in the promise callbacks, never directly in the effect.
    useEffect(() => {
        let cancelled = false;
        requestCurrent()
            .then((data) => { if (!cancelled) applyData(data); })
            .catch((err) => { if (!cancelled) setError(getErrorMessage(err, 'Failed to load recipes.')); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            applyData(await requestGenerate());
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to generate recipes.'));
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePin = async (recipe) => {
        setPinningId(recipe.id);
        try {
            if (recipe.is_pinned) await axiosClient.delete(`/recipes/${recipe.id}/pin`);
            else await axiosClient.put(`/recipes/${recipe.id}/pin`);
            applyData(await requestCurrent()); // the server decides the order: pinned first
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, 'Could not update the pin.'));
        } finally {
            setPinningId(null);
        }
    };

    const showEmpty = !isLoading && !isGenerating && recipes.length === 0 && !error;

    return (
        <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md">
            <NavBar />

            <main className="max-w-5xl mx-auto px-gutter-sm md:px-gutter pb-margin">
                <header className="py-space-xl">
                    <h1 className="font-headline-xl text-headline-xl text-on-surface mb-space-sm">Recipes</h1>
                    <p className="max-w-lg text-on-surface-variant">
                        Turn your expiring pantry ingredients into delicious, chef-crafted meals. Zero food wasted, maximum flavor.
                    </p>
                </header>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-space-xl h-12 bg-primary text-on-primary rounded-full font-label-md hover:bg-primary-container transition-colors disabled:opacity-60"
                >
                    {isGenerating ? 'Generating...' : 'Generate recipes'}
                </button>

                {recipes.length > 0 && !isGenerating && (
                    <p className="mt-space-sm text-label-sm text-on-surface-variant">
                        Pin a recipe to keep it at the top. The others disappear {ttlMinutes} minutes after they were generated.
                    </p>
                )}

                {error && (
                    <div className="p-space-md mt-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>
                )}

                {isLoading && <p className="mt-space-xl text-outline">Loading recipes...</p>}

                {showEmpty && (
                    <div className="mt-space-xl flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant text-center px-space-md">
                        No recipes yet. Press "Generate recipes" to see what you can cook.
                    </div>
                )}

                {!isLoading && !isGenerating && recipes.length > 0 && (
                    <div className="mt-space-lg grid sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
                        {recipes.map((recipe) => (
                            <div
                                key={recipe.id}
                                className={`relative rounded-xl border bg-surface-container-lowest hover:shadow-sm transition ${recipe.is_pinned ? 'border-primary' : 'border-outline-variant hover:border-primary'
                                    }`}
                            >
                                <Link to={`/recipes/${recipe.id}`} className="block p-space-md min-h-44">
                                    <h3 className="font-headline-sm text-on-surface mb-space-sm pr-10">
                                        {recipe.title ?? recipe.name}
                                    </h3>
                                    <p className="text-body-sm text-on-surface-variant">{recipe.description}</p>
                                    {totalTime(recipe) > 0 && (
                                        <p className="text-label-sm text-primary mt-space-sm">
                                            {totalTime(recipe)} min total
                                            {prepTime(recipe) > 0 && cookTime(recipe) > 0 &&
                                                ` (prep ${prepTime(recipe)} + cook ${cookTime(recipe)})`}
                                        </p>
                                    )}
                                </Link>

                                {/* The pin button is next to the link, not inside it, so clicking it does not open the recipe */}
                                <button
                                    type="button"
                                    onClick={() => togglePin(recipe)}
                                    disabled={pinningId === recipe.id}
                                    aria-pressed={recipe.is_pinned}
                                    aria-label={recipe.is_pinned ? 'Unpin recipe' : 'Pin recipe'}
                                    title={recipe.is_pinned ? 'Unpin recipe' : 'Pin recipe'}
                                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-surface-variant transition-colors disabled:opacity-60"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`w-5 h-5 ${recipe.is_pinned
                                                ? 'fill-primary stroke-primary'
                                                : 'fill-none stroke-current text-on-surface-variant'
                                            }`}
                                    >
                                        <path d="M12 17v5" />
                                        <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}