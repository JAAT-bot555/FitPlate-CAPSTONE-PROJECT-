import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errMsg } from '../services/api';
import { useUI } from '../context/UI';
import { ErrorBox, PageHeader, Spinner, Stat } from '../components/common';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dateLabel = value => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const emptyBody = { weightKg: '', muscleMassKg: '', bodyFatPct: '', waistCm: '', notes: '' };

function TrendChart({ title, dataKey, data, color, unit }) {
  if (!data.length) return <div className="card"><h2 className="mb-4 font-semibold">{title}</h2><p className="py-12 text-center text-sm text-stone-500">Add measurements to see your trend.</p></div>;
  return (
    <div className="card">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={value => [`${value} ${unit}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} connectNulls dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Tracker() {
  const { toast } = useUI();
  const [date, setDate] = useState(today);
  const [recipes, setRecipes] = useState([]);
  const [food, setFood] = useState({ recipeId: '', category: 'breakfast', servings: '1' });
  const [body, setBody] = useState(emptyBody);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const end = new Date(`${date}T00:00:00`);
    end.setDate(end.getDate() - 29);
    const from = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const result = await api.get('/tracker', { params: { from, to: date } });
    setLogs(result.data.foodLogs);
    setMetrics(result.data.bodyMetrics);
  }, [date]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/recipes', { params: { limit: 100 } }),
      api.get('/tracker', { params: { from: (() => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(), to: date } }),
    ]).then(([recipeResult, trackerResult]) => {
      if (!active) return;
      setRecipes(recipeResult.data.items);
      setLogs(trackerResult.data.foodLogs);
      setMetrics(trackerResult.data.bodyMetrics);
      setFood(current => ({ ...current, recipeId: current.recipeId || recipeResult.data.items[0]?._id || '' }));
    }).catch(e => { if (active) setError(errMsg(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const selectedLogs = useMemo(() => logs.filter(item => item.eatenAt.slice(0, 10) === date), [date, logs]);
  const totals = useMemo(() => selectedLogs.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbohydrates: sum.carbohydrates + item.carbohydrates,
    fats: sum.fats + item.fats,
  }), { calories: 0, protein: 0, carbohydrates: 0, fats: 0 }), [selectedLogs]);
  const chartData = useMemo(() => metrics.map(item => ({
    day: dateLabel(item.measuredAt),
    weight: item.weightKg,
    muscle: item.muscleMassKg ?? null,
    bodyFat: item.bodyFatPct ?? null,
    waist: item.waistCm ?? null,
  })), [metrics]);
  const latest = metrics[metrics.length - 1];
  const first = metrics[0];
  const delta = key => latest?.[key] !== undefined && first?.[key] !== undefined
    ? `${latest[key] - first[key] > 0 ? '+' : ''}${(latest[key] - first[key]).toFixed(1)}`
    : '—';

  const addFood = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tracker/foods', { ...food, servings: Number(food.servings), date });
      await load();
      toast('Food added to your log');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  const addBody = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tracker/body', { ...body, date });
      setBody(emptyBody);
      await load();
      toast('Body measurement saved');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (kind, id) => {
    try {
      await api.delete(`/tracker/${kind}/${id}`);
      await load();
      toast(kind === 'foods' ? 'Food entry removed' : 'Measurement removed');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={() => { setLoading(true); setError(''); load().catch(e => setError(errMsg(e))).finally(() => setLoading(false)); }} />;

  return (
    <div>
      <PageHeader title="Food & body tracker" sub="Log what you eat and follow your nutrition and body measurements over time." />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="block"><span className="label">Tracking date</span><input aria-label="Tracking date" className="input w-auto" type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} /></label>
        <p className="pb-2 text-xs text-stone-500">Nutrition is estimated from the recipe data and servings you log.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Calories eaten" value={`${Math.round(totals.calories)} kcal`} />
        <Stat label="Protein" value={`${totals.protein.toFixed(1)} g`} />
        <Stat label="Carbohydrates" value={`${totals.carbohydrates.toFixed(1)} g`} />
        <Stat label="Fats" value={`${totals.fats.toFixed(1)} g`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form className="card space-y-3" onSubmit={addFood}>
          <div><h2 className="font-display text-lg font-semibold">Log food eaten</h2><p className="text-sm text-stone-500">Choose a recipe and how many servings you ate.</p></div>
          <label className="block"><span className="label">Recipe</span><select required className="input" value={food.recipeId} onChange={e => setFood({ ...food, recipeId: e.target.value })}>{recipes.map(recipe => <option key={recipe._id} value={recipe._id}>{recipe.name}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Meal</span><select className="input" value={food.category} onChange={e => setFood({ ...food, category: e.target.value })}>{['breakfast', 'lunch', 'snack', 'dinner'].map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
            <label className="block"><span className="label">Servings</span><input className="input" type="number" min="0.25" max="20" step="0.25" value={food.servings} onChange={e => setFood({ ...food, servings: e.target.value })} required /></label>
          </div>
          <button className="btn-primary" disabled={saving || !recipes.length}>Add food</button>
        </form>

        <form className="card space-y-3" onSubmit={addBody}>
          <div><h2 className="font-display text-lg font-semibold">Record body measurements</h2><p className="text-sm text-stone-500">Measurements are entered by you; the app does not estimate body composition.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Weight (kg) *</span><input className="input" type="number" min="1" max="1000" step="0.1" value={body.weightKg} onChange={e => setBody({ ...body, weightKg: e.target.value })} required /></label>
            <label className="block"><span className="label">Muscle mass (kg)</span><input className="input" type="number" min="0" max="1000" step="0.1" value={body.muscleMassKg} onChange={e => setBody({ ...body, muscleMassKg: e.target.value })} /></label>
            <label className="block"><span className="label">Body fat (%)</span><input className="input" type="number" min="0" max="100" step="0.1" value={body.bodyFatPct} onChange={e => setBody({ ...body, bodyFatPct: e.target.value })} /></label>
            <label className="block"><span className="label">Waist (cm)</span><input className="input" type="number" min="1" max="300" step="0.1" value={body.waistCm} onChange={e => setBody({ ...body, waistCm: e.target.value })} /></label>
          </div>
          <label className="block"><span className="label">Notes (optional)</span><input className="input" maxLength="300" value={body.notes} onChange={e => setBody({ ...body, notes: e.target.value })} /></label>
          <button className="btn-primary" disabled={saving}>Save measurements</button>
        </form>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Your 30-day body trend</h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Latest weight" value={latest ? `${latest.weightKg} kg` : '—'} sub={`Change in period: ${delta('weightKg')} kg`} />
          <Stat label="Latest muscle mass" value={latest?.muscleMassKg != null ? `${latest.muscleMassKg} kg` : '—'} sub={`Change in period: ${delta('muscleMassKg')} kg`} />
          <Stat label="Latest body fat" value={latest?.bodyFatPct != null ? `${latest.bodyFatPct}%` : '—'} sub={`Change in period: ${delta('bodyFatPct')}%`} />
          <Stat label="Latest waist" value={latest?.waistCm != null ? `${latest.waistCm} cm` : '—'} sub={`Change in period: ${delta('waistCm')} cm`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart title="Weight (kg)" dataKey="weight" data={chartData} color="#3d9c33" unit="kg" />
          <TrendChart title="Muscle mass (kg)" dataKey="muscle" data={chartData.filter(item => item.muscle != null)} color="#fb7c14" unit="kg" />
          <TrendChart title="Body fat (%)" dataKey="bodyFat" data={chartData.filter(item => item.bodyFat != null)} color="#8b5cf6" unit="%" />
          <TrendChart title="Waist (cm)" dataKey="waist" data={chartData.filter(item => item.waist != null)} color="#0ea5e9" unit="cm" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Food eaten · {dateLabel(date)}</h2>
          {selectedLogs.length ? <ul className="divide-y divide-stone-100">{selectedLogs.map(item => <li key={item._id} className="flex items-start justify-between gap-3 py-3">
            <div><div className="font-medium">{item.name} <span className="badge ml-1">{item.category}</span></div><div className="text-xs text-stone-500">{item.servings} serving{item.servings === 1 ? '' : 's'} · {Math.round(item.calories)} kcal · P {item.protein} g · C {item.carbohydrates} g · F {item.fats} g</div></div>
            <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove('foods', item._id)} aria-label={`Remove ${item.name}`}>Remove</button>
          </li>)}</ul> : <p className="py-8 text-center text-sm text-stone-500">No foods logged for this date yet.</p>}
        </section>
        <section className="card">
          <h2 className="mb-3 font-display text-lg font-semibold">Measurements · last 30 days</h2>
          {metrics.length ? <ul className="divide-y divide-stone-100">{[...metrics].reverse().map(item => <li key={item._id} className="flex items-start justify-between gap-3 py-3">
            <div><div className="font-medium">{dateLabel(item.measuredAt)} · {item.weightKg} kg</div><div className="text-xs text-stone-500">{item.muscleMassKg != null && `Muscle ${item.muscleMassKg} kg · `}{item.bodyFatPct != null && `Body fat ${item.bodyFatPct}% · `}{item.waistCm != null && `Waist ${item.waistCm} cm`}{item.notes && ` · ${item.notes}`}</div></div>
            <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove('body', item._id)} aria-label={`Remove measurement from ${dateLabel(item.measuredAt)}`}>Remove</button>
          </li>)}</ul> : <p className="py-8 text-center text-sm text-stone-500">No body measurements recorded yet.</p>}
        </section>
      </div>
      <p className="mt-4 text-xs text-stone-500">Currently tracks calories, protein, carbohydrates, and fats available in project recipes. Values are estimates, not medical advice; vitamins, minerals, fiber, and other micronutrients are not in the recipe data.</p>
    </div>
  );
}
