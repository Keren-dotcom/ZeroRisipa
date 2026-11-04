import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient, { getErrorMessage } from '../api/axiosClient';

// Units used by the backend seed data
const UNITS = ['pcs', 'g', 'ml', 'clove', 'slice'];
const EMPTY_FORM = { name: '', quantity: '', unit: 'pcs', expiryDate: '' };

const byExpiry = (a, b) => a.expiry_date.localeCompare(b.expiry_date);

export default function Pantry() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [ingredientsCatalog, setIngredientsCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catalogRes, pantryRes] = await Promise.all([
          axiosClient.get('/ingredients', { params: { limit: 100 } }), // backend default is 20
          axiosClient.get('/pantry'), // already sorted by expiry date
        ]);
        setIngredientsCatalog(catalogRes.data);
        setItems(pantryRes.data);
        setError('');
      } catch {
        setError('Failed to load pantry data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const findIngredient = (name) =>
    ingredientsCatalog.find((ing) => ing.name.toLowerCase() === name.trim().toLowerCase());

  const handleNameChange = (name) => {
    // Pre-fill the unit with the ingredient's default unit when it's picked from the list
    const ingredient = findIngredient(name);
    setFormData({ ...formData, name, unit: ingredient?.default_unit ?? formData.unit });
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  // Returns the catalogue ingredient with this name, creating it in the user's own
  // catalogue (POST /ingredients) when it isn't in the list yet.
  const resolveIngredient = async (name) => {
    const known = findIngredient(name);
    if (known) return known;
    try {
      const response = await axiosClient.post('/ingredients', {
        name: name.trim(),
        default_unit: formData.unit,
      });
      setIngredientsCatalog((prev) =>
        [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      return response.data;
    } catch (err) {
      // 409: it already exists but wasn't in the loaded list, so look it up by name
      if (err.response?.status !== 409) throw err;
      const { data } = await axiosClient.get('/ingredients', { params: { q: name.trim(), limit: 100 } });
      const match = data.find((ing) => ing.name.toLowerCase() === name.trim().toLowerCase());
      if (!match) throw err;
      setIngredientsCatalog((prev) => [...prev, match]);
      return match;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const ingredient = await resolveIngredient(formData.name);
      const payload = {
        ingredient_id: ingredient.id,
        quantity: formData.quantity,
        unit: formData.unit,
        expiry_date: formData.expiryDate,
      };
      if (editingId) {
        const response = await axiosClient.patch(`/pantry/${editingId}`, payload);
        setItems((prev) => prev.map((item) => (item.id === editingId ? response.data : item)).sort(byExpiry));
      } else {
        const response = await axiosClient.post('/pantry', payload);
        setItems((prev) => [...prev, response.data].sort(byExpiry));
      }
      resetForm();
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save item.'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axiosClient.delete(`/pantry/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete item.'));
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiry_date,
    });
    setEditingId(item.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Highlight items expiring within 3 days (compared by calendar day, in local time)
  const isExpiringSoon = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExpiry = (new Date(`${dateString}T00:00:00`) - today) / (1000 * 3600 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md py-margin-sm px-gutter-sm md:px-gutter">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-space-xl">
        <h1 className="font-headline-xl text-headline-xl text-primary">My Pantry</h1>
        <button onClick={handleLogout} className="px-space-md py-space-sm bg-surface-container-low text-on-surface rounded-full hover:bg-surface-variant transition-colors font-label-md">
          Logout
        </button>
      </header>

      <main className="max-w-5xl mx-auto grid md:grid-cols-3 gap-space-xl">
        {/* Add/Edit Food Form */}
        <section className="md:col-span-1 bg-surface-container-lowest border border-outline-variant p-space-lg rounded-xl shadow-sm h-fit">
          <h2 className="font-headline-md mb-space-md">{editingId ? 'Edit Item' : 'Add Food'}</h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
            <div>
              <label className="font-label-md text-on-surface-variant">Ingredient</label>
              {/* Autocomplete from GET /ingredients; a new name is added to the user's own catalogue */}
              <input list="ingredients-list" required maxLength={100} value={formData.name} onChange={(e) => handleNameChange(e.target.value)} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" placeholder="e.g., Tomatoes" />
              <datalist id="ingredients-list">
                {ingredientsCatalog.map((ing) => <option key={ing.id} value={ing.name} label={ing.is_custom ? 'my ingredient' : undefined} />)}
              </datalist>
              {formData.name.trim() && !findIngredient(formData.name) && (
                <p className="text-label-sm text-on-surface-variant mt-1">New ingredient: it will be added to your own catalogue.</p>
              )}
            </div>

            <div className="flex gap-space-sm">
              <div className="flex-1">
                <label className="font-label-md text-on-surface-variant">Quantity</label>
                <input type="number" min="0.01" step="any" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" />
              </div>
              <div className="flex-1">
                <label className="font-label-md text-on-surface-variant">Unit</label>
                <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]">
                  {[...new Set([...UNITS, formData.unit])].map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant">Expiry Date</label>
              <input type="date" required value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" />
            </div>

            <button type="submit" className="w-full h-10 mt-space-sm bg-primary text-on-primary rounded-full font-label-md hover:bg-primary-container transition-colors">
              {editingId ? 'Update Item' : 'Add to Pantry'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="w-full h-10 bg-surface-container-low text-on-surface rounded-full font-label-md hover:bg-surface-variant">
                Cancel Edit
              </button>
            )}
          </form>
        </section>

        {/* Food List Inventory */}
        <section className="md:col-span-2">
          {/* Error State */}
          {error && <div className="p-space-md mb-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>}
          
          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center p-margin text-outline">Loading pantry items...</div>
          ) : items.length === 0 ? (
            /* Empty list state */
            <div className="flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
              Your pantry is empty. Add some food!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-space-md">
              {items.map((item) => (
                <div key={item.id} className={`p-space-md rounded-xl border bg-surface flex flex-col justify-between ${isExpiringSoon(item.expiry_date) ? 'border-error shadow-sm' : 'border-outline-variant'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-space-xs">
                      <h3 className="font-headline-sm text-on-surface">{item.ingredient.name}</h3>
                      {/* Highlighting the ones expiring soon */}
                      {isExpiringSoon(item.expiry_date) && <span className="text-label-sm text-error bg-error-container px-2 py-0.5 rounded-full">Expiring Soon</span>}
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{Number(item.quantity)} {item.unit}</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">Expires: <span className="font-semibold">{item.expiry_date}</span></p>
                  </div>
                  <div className="flex gap-space-sm mt-space-md pt-space-sm border-t border-surface-container-high">
                    <button onClick={() => handleEdit(item)} className="text-label-sm text-primary hover:underline">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-label-sm text-error hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}