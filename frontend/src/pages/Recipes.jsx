import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import NavBar from './NavBar';

// Your backend returns { items: [...], total, limit, offset }; other list shapes are accepted too
const requestRecipes = () =>
    axiosClient.get('/recipes', { params: { limit: 100 } }).then((res) => {
        const body = res.data;
        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.items)) return body.items;
        if (Array.isArray(body?.recipes)) return body.recipes;
        if (Array.isArray(body?.data)) return body.data;
        throw new Error('GET /recipes did not return a list of recipes');
    });

// Converts a value to a number (the API may send "10" as a string or Decimal); anything invalid becomes 0
const toMinutes = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

// Reads the first field name that exists, so a different naming (prepTime, prep_time_minutes...) still works
const prepTime = (recipe) =>
    toMinutes(recipe.prep_time ?? recipe.prepTime ?? recipe.prep_time_minutes ?? recipe.prep_time_min);
const cookTime = (recipe) =>
    toMinutes(recipe.cook_time ?? recipe.cookTime ?? recipe.cook_time_minutes ?? recipe.cook_time_min);
const totalTime = (recipe) => prepTime(recipe) + cookTime(recipe);

export default function Recipes() {
    // Nothing is loaded or shown until the button is pressed
    const [generated, setGenerated] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const list = await requestRecipes();
            console.log('GET /recipes ->', list[0]); // check here which time fields the backend really sends
            setRecipes(list);
            setGenerated(true);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load recipes.'));
        } finally {
            setIsGenerating(false);
        }
    };

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

                {error && (
                    <div className="p-space-md mt-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>
                )}

                {!generated && !isGenerating && (
                    <div className="mt-space-xl flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant text-center px-space-md">
                        No recipes yet. Press "Generate recipes" to see what you can cook.
                    </div>
                )}

                {generated && !isGenerating && recipes.length === 0 && !error && (
                    <div className="mt-space-xl flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
                        No recipes found.
                    </div>
                )}

                {generated && !isGenerating && recipes.length > 0 && (
                    <div className="mt-space-xl grid sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
                        {recipes.map((recipe) => (
                            <Link
                                key={recipe.id}
                                to={`/recipes/${recipe.id}`}
                                className="p-space-md min-h-44 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary hover:shadow-sm transition"
                            >
                                <h3 className="font-headline-sm text-on-surface mb-space-sm">{recipe.title}</h3>
                                <p className="text-body-sm text-on-surface-variant">{recipe.description}</p>
                                {totalTime(recipe) > 0 && (
                                    <p className="text-label-sm text-primary mt-space-sm">
                                        {totalTime(recipe)} min total
                                        {prepTime(recipe) > 0 && cookTime(recipe) > 0 &&
                                            ` (prep ${prepTime(recipe)} + cook ${cookTime(recipe)})`}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}