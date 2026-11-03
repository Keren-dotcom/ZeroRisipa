import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function Pantry() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [ingredientsCatalog, setIngredientsCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', quantity: '', unit: 'pcs', expiryDate: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catalogRes, pantryRes] = await Promise.all([
        axiosClient.get('/ingredients'),
        axiosClient.get('/pantry')
      ]);
      
      setIngredientsCatalog(catalogRes.data);
      
      // Sort items by expiry date
      const sortedItems = pantryRes.data.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
      setItems(sortedItems);
      setError('');
    } catch (err) {
      setError('Failed to load pantry data.');
    } finally {
      setIsLoading(false);
    }
  };

const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Edit existing item
        await axiosClient.put(`/pantry/${editingId}`, formData);
        setItems(items.map(item => item.id === editingId ? { ...item, ...formData } : item).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)));
        setEditingId(null);
      } else {
        // Add new ingredients
        const response = await axiosClient.post('/pantry', formData);
        const newItem = response.data; // Ensure backend returns the created item
        setItems([...items, newItem].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)));
      }
      setFormData({ name: '', quantity: '', unit: 'pcs', expiryDate: '' });
    } catch (err) {
      setError('Failed to save item.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) { // Delete with confirmation
      try {
        await axiosClient.delete(`/pantry/${id}`).catch(() => {});
        setItems(items.filter(item => item.id !== id));
      } catch (err) {
        setError('Failed to delete item.');
      }
    }
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, quantity: item.quantity, unit: item.unit, expiryDate: item.expiryDate });
    setEditingId(item.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Helper to highlight items expiring soon (within 3 days)
  const isExpiringSoon = (dateString) => {
    const daysUntilExpiry = (new Date(dateString) - new Date()) / (1000 * 3600 * 24);
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
              {/* Autocomplete from /ingredients[cite: 3] */}
              <input list="ingredients-list" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" placeholder="e.g., Tomatoes" />
              <datalist id="ingredients-list">
                {ingredientsCatalog.map((ing, idx) => <option key={idx} value={ing.name || ing} />)}
              </datalist>
            </div>

            <div className="flex gap-space-sm">
              <div className="flex-1">
                <label className="font-label-md text-on-surface-variant">Quantity</label> {/* Quantity[cite: 3] */}
                <input type="number" min="1" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" />
              </div>
              <div className="flex-1">
                <label className="font-label-md text-on-surface-variant">Unit</label> {/* Unit[cite: 3] */}
                <select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]">
                  <option value="pcs">pcs</option>
                  <option value="kg">kg</option>
                  <option value="grams">grams</option>
                  <option value="liters">liters</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant">Expiry Date</label> {/* Expiry date[cite: 3] */}
              <input type="date" required value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} className="w-full h-10 px-3 mt-1 bg-surface-container-low rounded-lg outline-none focus:shadow-[0_0_0_2px_#006b2c]" />
            </div>

            <button type="submit" className="w-full h-10 mt-space-sm bg-primary text-on-primary rounded-full font-label-md hover:bg-primary-container transition-colors">
              {editingId ? 'Update Item' : 'Add to Pantry'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', quantity: '', unit: 'pcs', expiryDate: '' }); }} className="w-full h-10 bg-surface-container-low text-on-surface rounded-full font-label-md hover:bg-surface-variant">
                Cancel Edit
              </button>
            )}
          </form>
        </section>

        {/* Food List Inventory */}
        <section className="md:col-span-2">
          {/* Error State[cite: 3] */}
          {error && <div className="p-space-md mb-space-md bg-error-container text-on-error-container rounded-lg font-label-md">{error}</div>}
          
          {/* Loading State[cite: 3] */}
          {isLoading ? (
            <div className="flex justify-center p-margin text-outline">Loading pantry items...</div>
          ) : items.length === 0 ? (
            /* Empty list state[cite: 3] */
            <div className="flex justify-center items-center h-48 bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
              Your pantry is empty. Add some food!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-space-md">
              {items.map((item) => (
                <div key={item.id} className={`p-space-md rounded-xl border bg-surface flex flex-col justify-between ${isExpiringSoon(item.expiryDate) ? 'border-error shadow-sm' : 'border-outline-variant'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-space-xs">
                      <h3 className="font-headline-sm text-on-surface">{item.name}</h3>
                      {/* Highlighting the ones expiring soon[cite: 3] */}
                      {isExpiringSoon(item.expiryDate) && <span className="text-label-sm text-error bg-error-container px-2 py-0.5 rounded-full">Expiring Soon</span>}
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{item.quantity} {item.unit}</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">Expires: <span className="font-semibold">{item.expiryDate}</span></p>
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