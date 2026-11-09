import { useState, useEffect } from 'react';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useUI } from '../context/UI';
import { useAuth } from '../context/Auth';
import {
  Spinner,
  ErrorBox,
  Empty,
  PageHeader,
  Modal,
  Field,
  Stat,
  inr,
} from '../components/common';

export function AdminOverview() {
  const { data, loading, error, reload } = useFetch(() =>
    api.get('/admin/stats')
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="Admin overview" sub="Live system statistics." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users} />
        <Stat label="Recipes" value={data.recipes} />
        <Stat label="Meal plans" value={data.mealPlans} />
        <Stat label="Grocery lists" value={data.groceryLists} />
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { toast, confirm } = useUI();
  const { user: currentUser } = useAuth();
  const { data, loading, error, reload } = useFetch(() =>
    api.get('/admin/users')
  );
  const [search, setSearch] = useState('');

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const filteredUsers = data.filter((u) =>
    (u.name + u.email).toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteUser = async (targetUser) => {
    if (!(await confirm(`Delete ${targetUser.email}?`))) {
      return;
    }
    try {
      await api.delete(`/admin/users/${targetUser._id}`);
      toast('User deleted');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Users" sub={`${data.length} registered`} />
      <input
        className="input mb-4 max-w-sm"
        placeholder="🔍 Search users…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              {['Name', 'Email', 'Role', 'Diet', 'Goal', 'Joined', ''].map(
                (header) => (
                  <th key={header} className="px-4 py-3">
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      u.role === 'admin' ? 'bg-tang-100 text-tang-600' : ''
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">{u.dietaryPreference}</td>
                <td className="px-4 py-3">{u.fitnessGoal}</td>
                <td className="px-4 py-3">
                  {new Date(u.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3 text-right">
                  {u._id !== currentUser._id && (
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDeleteUser(u)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredUsers.length && (
          <p className="p-6 text-center text-sm text-stone-500">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
}

const DEFAULT_RECIPE_FORM = {
  name: '',
  description: '',
  cuisine: 'North Indian',
  category: 'lunch',
  cookingTime: 30,
  calories: 400,
  protein: 15,
  carbohydrates: 50,
  fats: 10,
  estimatedCost: 50,
  tags: 'vegetarian',
  ingredients: 'rice, 100, g',
  instructions: 'Prep the ingredients.\nCook until done.',
};

function RecipeFormModal({ recipe, onClose, onSaved }) {
  const { toast } = useUI();

  const [form, setForm] = useState(
    recipe
      ? {
          ...recipe,
          tags: (recipe.dietaryTags || []).join(', '),
          ingredients: (recipe.ingredients || [])
            .map((ing) => `${ing.name}, ${ing.quantity}, ${ing.unit}`)
            .join('\n'),
          instructions: (recipe.instructions || []).join('\n'),
        }
      : DEFAULT_RECIPE_FORM
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      return setError('Name is required');
    }

    const parsedIngredients = form.ingredients
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, qty, unit] = line.split(',').map((part) => part.trim());
        return {
          name: (name || '').toLowerCase(),
          quantity: Number(qty),
          unit: unit || 'g',
        };
      });

    if (
      !parsedIngredients.length ||
      parsedIngredients.some((ing) => !ing.name || !(ing.quantity > 0))
    ) {
      return setError(
        'Each ingredient line must look like: name, quantity, unit'
      );
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      cuisine: form.cuisine,
      category: form.category,
      cookingTime: Number(form.cookingTime),
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbohydrates: Number(form.carbohydrates),
      fats: Number(form.fats),
      estimatedCost: Number(form.estimatedCost),
      dietaryTags: form.tags
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      ingredients: parsedIngredients,
      instructions: form.instructions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setBusy(true);
    try {
      if (recipe) {
        await api.put(`/admin/recipes/${recipe._id}`, payload);
      } else {
        await api.post('/admin/recipes', payload);
      }
      toast(recipe ? 'Recipe updated' : 'Recipe added');
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const renderNumberInput = (key, label) => (
    <Field label={label}>
      <input
        className="input"
        type="number"
        min="0"
        value={form[key]}
        onChange={updateField(key)}
      />
    </Field>
  );

  return (
    <Modal
      title={recipe ? 'Edit recipe' : 'Add recipe'}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 sm:grid-cols-2"
        noValidate
      >
        <div className="sm:col-span-2">
          <Field label="Name">
            <input
              className="input"
              value={form.name}
              onChange={updateField('name')}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <input
              className="input"
              value={form.description || ''}
              onChange={updateField('description')}
            />
          </Field>
        </div>
        <Field label="Cuisine">
          <input
            className="input"
            value={form.cuisine}
            onChange={updateField('cuisine')}
          />
        </Field>
        <Field label="Meal">
          <select
            className="input"
            value={form.category}
            onChange={updateField('category')}
          >
            {['breakfast', 'lunch', 'snack', 'dinner'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        {renderNumberInput('cookingTime', 'Cooking time (min)')}
        {renderNumberInput('calories', 'Calories')}
        {renderNumberInput('protein', 'Protein (g)')}
        {renderNumberInput('carbohydrates', 'Carbs (g)')}
        {renderNumberInput('fats', 'Fats (g)')}
        {renderNumberInput('estimatedCost', 'Cost (₹)')}

        <div className="sm:col-span-2">
          <Field label="Dietary tags (comma separated: vegetarian, vegan, non-veg, high-protein, budget)">
            <input
              className="input"
              value={form.tags}
              onChange={updateField('tags')}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Ingredients (one per line: name, quantity, unit)">
            <textarea
              className="input font-mono"
              rows="4"
              value={form.ingredients}
              onChange={updateField('ingredients')}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Instructions (one step per line)">
            <textarea
              className="input"
              rows="3"
              value={form.instructions}
              onChange={updateField('instructions')}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminRecipes() {
  const { toast, confirm } = useUI();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, loading, error, reload } = useFetch(
    () =>
      api.get('/recipes', {
        params: { q: debouncedQuery || undefined, page, limit: 10 },
      }),
    [debouncedQuery, page]
  );

  const handleDeleteRecipe = async (recipe) => {
    if (!(await confirm(`Delete "${recipe.name}"?`))) {
      return;
    }
    try {
      await api.delete(`/admin/recipes/${recipe._id}`);
      toast('Recipe deleted');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 10)) : 1;

  return (
    <div>
      <PageHeader title="Recipes" sub={data ? `${data.total} total` : ''}>
        <button className="btn-primary" onClick={() => setEditingRecipe({})}>
          + Add recipe
        </button>
      </PageHeader>

      <input
        className="input mb-4 max-w-sm"
        placeholder="🔍 Search recipes…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data.items.length ? (
        <Empty icon="📖" title="No recipes found" />
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  {[
                    'Name',
                    'Meal',
                    'Cuisine',
                    'kcal',
                    'Protein',
                    'Cost',
                    '',
                  ].map((header) => (
                    <th key={header} className="px-4 py-3">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((recipe) => (
                  <tr key={recipe._id}>
                    <td className="px-4 py-3 font-medium">{recipe.name}</td>
                    <td className="px-4 py-3">{recipe.category}</td>
                    <td className="px-4 py-3">{recipe.cuisine}</td>
                    <td className="px-4 py-3">{recipe.calories}</td>
                    <td className="px-4 py-3">{recipe.protein} g</td>
                    <td className="px-4 py-3">{inr(recipe.estimatedCost)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        className="mr-3 text-leaf-700 hover:underline"
                        onClick={() => setEditingRecipe(recipe)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDeleteRecipe(recipe)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button
              className="btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn-ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {editingRecipe && (
        <RecipeFormModal
          recipe={editingRecipe._id ? editingRecipe : null}
          onClose={() => setEditingRecipe(null)}
          onSaved={() => {
            setEditingRecipe(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

export function AdminIngredients() {
  const { toast, confirm } = useUI();
  const ingredients = useFetch(() => api.get('/admin/ingredients'));
  const categories = useFetch(() => api.get('/admin/categories'));

  const [newForm, setNewForm] = useState({ name: '', category: '', price: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [renameState, setRenameState] = useState(null);
  const [search, setSearch] = useState('');

  const refreshAll = () => {
    ingredients.reload();
    categories.reload();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const active = editingItem || newForm;

    if (
      !active.name.trim() ||
      !active.category.trim() ||
      !(Number(active.price) >= 0) ||
      active.price === ''
    ) {
      return toast('Name, category and a valid price are required', 'error');
    }

    try {
      const payload = {
        name: active.name.trim().toLowerCase(),
        category: active.category.trim(),
        price: Number(active.price),
      };
      if (editingItem) {
        await api.put(`/admin/ingredients/${editingItem._id}`, payload);
      } else {
        await api.post('/admin/ingredients', payload);
      }
      toast(editingItem ? 'Ingredient updated' : 'Ingredient added');
      setEditingItem(null);
      setNewForm({ name: '', category: '', price: '' });
      refreshAll();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!(await confirm(`Delete ingredient "${item.name}"?`))) {
      return;
    }
    try {
      await api.delete(`/admin/ingredients/${item._id}`);
      toast('Deleted');
      refreshAll();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleRenameCategory = async () => {
    if (!renameState.to.trim()) {
      return toast('Enter a new name', 'error');
    }
    try {
      await api.patch(
        `/admin/categories/${encodeURIComponent(renameState.from)}`,
        { name: renameState.to.trim() }
      );
      toast('Category renamed');
      setRenameState(null);
      refreshAll();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const currentValues = editingItem || newForm;
  const updateCurrent = (patch) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, ...patch });
    } else {
      setNewForm({ ...newForm, ...patch });
    }
  };

  if (ingredients.loading || categories.loading) return <Spinner />;
  if (ingredients.error) {
    return <ErrorBox error={ingredients.error} onRetry={refreshAll} />;
  }

  const filteredRows = ingredients.data.filter(
    (item) =>
      item.name.includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Ingredients & categories"
        sub="Prices (₹ per kg/l, or per piece) feed grocery cost estimates."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(categories.data || []).map((cat) => (
          <button
            key={cat._id}
            className="badge cursor-pointer bg-white ring-1 ring-stone-200 hover:ring-leaf-500"
            onClick={() => setRenameState({ from: cat._id, to: cat._id })}
          >
            {cat._id} · {cat.count} ✎
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSave}
        className="card mb-6 grid gap-3 sm:grid-cols-4"
        noValidate
      >
        <Field label="Name">
          <input
            className="input"
            value={currentValues.name}
            onChange={(e) => updateCurrent({ name: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <input
            className="input"
            value={currentValues.category}
            onChange={(e) => updateCurrent({ category: e.target.value })}
            list="cats"
          />
          <datalist id="cats">
            {(categories.data || []).map((cat) => (
              <option key={cat._id} value={cat._id} />
            ))}
          </datalist>
        </Field>
        <Field label="Price (₹)">
          <input
            className="input"
            type="number"
            min="0"
            value={currentValues.price}
            onChange={(e) => updateCurrent({ price: e.target.value })}
          />
        </Field>
        <div className="flex items-end gap-2">
          <button className="btn-primary flex-1">
            {editingItem ? 'Update' : '+ Add'}
          </button>
          {editingItem && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <input
        className="input mb-4 max-w-sm"
        placeholder="🔍 Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              {['Name', 'Category', 'Price', ''].map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRows.map((item) => (
              <tr key={item._id}>
                <td className="px-4 py-3 font-medium capitalize">
                  {item.name}
                </td>
                <td className="px-4 py-3">{item.category}</td>
                <td className="px-4 py-3">{inr(item.price)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="mr-3 text-leaf-700 hover:underline"
                    onClick={() => setEditingItem({ ...item })}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredRows.length && (
          <p className="p-6 text-center text-sm text-stone-500">
            No ingredients found.
          </p>
        )}
      </div>

      {renameState && (
        <Modal
          title={`Rename category "${renameState.from}"`}
          onClose={() => setRenameState(null)}
        >
          <Field label="New name">
            <input
              className="input"
              value={renameState.to}
              onChange={(e) =>
                setRenameState({ ...renameState, to: e.target.value })
              }
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="btn-ghost"
              onClick={() => setRenameState(null)}
            >
              Cancel
            </button>
            <button className="btn-primary" onClick={handleRenameCategory}>
              Rename
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
