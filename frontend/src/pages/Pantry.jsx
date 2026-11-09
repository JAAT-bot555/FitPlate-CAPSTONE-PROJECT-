import { useState, useMemo } from 'react';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useUI } from '../context/UI';
import { Spinner, ErrorBox, Empty, PageHeader, Field } from '../components/common';

const UNITS = ['g', 'kg', 'ml', 'l', 'pcs'];

function isLowStock(item) {
  if (item.unit === 'pcs') {
    return item.quantity < 2;
  }
  if (['g', 'ml'].includes(item.unit)) {
    return item.quantity < 100;
  }
  return item.quantity < 0.1;
}

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - Date.now()) / 86400000);
}

export default function Pantry() {
  const { toast, confirm } = useUI();
  const pantryItems = useFetch(() => api.get('/pantry'));
  const catalog = useFetch(() => api.get('/ingredients'));

  const [form, setForm] = useState({
    ingredient: '',
    quantity: '',
    unit: 'g',
    expiryDate: '',
  });
  const [search, setSearch] = useState('');
  const [editingQuantities, setEditingQuantities] = useState({});
  const [busy, setBusy] = useState(false);

  const categoryMap = useMemo(() => {
    return Object.fromEntries(
      (catalog.data || []).map((item) => [item.name, item.category])
    );
  }, [catalog.data]);

  const filteredList = useMemo(() => {
    return (pantryItems.data || []).filter((item) =>
      item.ingredient.toLowerCase().includes(search.toLowerCase())
    );
  }, [pantryItems.data, search]);

  const groupedItems = useMemo(() => {
    return filteredList.reduce((groups, item) => {
      const cat = categoryMap[item.ingredient.toLowerCase()] || 'Other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
      return groups;
    }, {});
  }, [filteredList, categoryMap]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ingredient.trim()) {
      return toast('Enter an ingredient name', 'error');
    }
    if (!(Number(form.quantity) > 0)) {
      return toast('Quantity must be greater than 0', 'error');
    }

    setBusy(true);
    try {
      await api.post('/pantry', {
        ...form,
        ingredient: form.ingredient.trim().toLowerCase(),
        quantity: Number(form.quantity),
        expiryDate: form.expiryDate || undefined,
      });
      setForm({ ingredient: '', quantity: '', unit: 'g', expiryDate: '' });
      pantryItems.reload();
      toast('Added to pantry');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveQuantity = async (item) => {
    const nextQty = Number(editingQuantities[item._id]);
    if (!(nextQty >= 0)) {
      return toast('Invalid quantity', 'error');
    }
    try {
      await api.put(`/pantry/${item._id}`, { quantity: nextQty });
      setEditingQuantities(({ [item._id]: _, ...rest }) => rest);
      pantryItems.reload();
      toast('Quantity updated');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!(await confirm(`Remove ${item.ingredient} from pantry?`))) {
      return;
    }
    try {
      await api.delete(`/pantry/${item._id}`);
      pantryItems.reload();
      toast('Removed');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Pantry"
        sub="What you already have is subtracted from your grocery list and boosts matching recipes."
      />

      <form
        onSubmit={handleAdd}
        className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        noValidate
      >
        <Field label="Ingredient">
          <input
            className="input"
            list="ing"
            value={form.ingredient}
            onChange={(e) => setForm({ ...form, ingredient: e.target.value })}
            placeholder="e.g. rice"
          />
          <datalist id="ing">
            {(catalog.data || []).map((item) => (
              <option key={item._id} value={item.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Quantity">
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </Field>
        <Field label="Unit">
          <select
            className="input"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {UNITS.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </Field>
        <Field label="Expiry (optional)">
          <input
            className="input"
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
        </Field>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={busy}>
            + Add
          </button>
        </div>
      </form>

      <input
        className="input mb-4 max-w-sm"
        placeholder="🔍 Search pantry…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pantryItems.loading ? (
        <Spinner />
      ) : pantryItems.error ? (
        <ErrorBox error={pantryItems.error} onRetry={pantryItems.reload} />
      ) : !filteredList.length ? (
        <Empty
          icon="🥫"
          title={search ? 'No match' : 'Your pantry is empty'}
        >
          {search ? 'Try another search.' : 'Add ingredients you already own.'}
        </Empty>
      ) : (
        Object.entries(groupedItems)
          .sort()
          .map(([category, items]) => (
            <div key={category} className="mb-5">
              <h3 className="mb-2 font-display text-lg font-bold">
                {category}{' '}
                <span className="text-sm font-normal text-stone-400">
                  ({items.length})
                </span>
              </h3>
              <div className="card divide-y p-0">
                {items.map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiryDate);
                  const isEditing = editingQuantities[item._id] !== undefined;

                  return (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-[8rem] flex-1 font-medium capitalize">
                        {item.ingredient}
                        {isLowStock(item) && (
                          <span className="ml-2 badge bg-amber-100 text-amber-800">
                            Low stock
                          </span>
                        )}
                        {daysLeft !== null && daysLeft <= 3 && (
                          <span className="ml-2 badge bg-red-100 text-red-700">
                            {daysLeft < 0
                              ? 'Expired'
                              : `Expires in ${daysLeft}d`}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <>
                          <input
                            className="input w-28"
                            type="number"
                            min="0"
                            step="any"
                            value={editingQuantities[item._id]}
                            onChange={(e) =>
                              setEditingQuantities({
                                ...editingQuantities,
                                [item._id]: e.target.value,
                              })
                            }
                          />
                          <span>{item.unit}</span>
                          <button
                            className="btn-primary py-1"
                            onClick={() => handleSaveQuantity(item)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-ghost py-1"
                            onClick={() =>
                              setEditingQuantities(
                                ({ [item._id]: _, ...rest }) => rest
                              )
                            }
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="w-24 text-stone-600">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            className="btn-ghost py-1"
                            onClick={() =>
                              setEditingQuantities({
                                ...editingQuantities,
                                [item._id]: item.quantity,
                              })
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="btn-ghost py-1 text-red-600"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
