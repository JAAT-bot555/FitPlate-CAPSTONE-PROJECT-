import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/Auth';
import { useUI } from '../context/UI';
import {
  Spinner,
  ErrorBox,
  Empty,
  PageHeader,
  Modal,
  Field,
  EMOJI,
  inr,
} from '../components/common';

const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

export default function Planner() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();

  const plans = useFetch(() => api.get('/meal-plans'));

  const [form, setForm] = useState({
    days: 3,
    meals: [...SLOTS],
    budget: user?.budget || 1500,
    dietaryPreference: user?.dietaryPreference || 'any',
    goal: user?.fitnessGoal || 'maintenance',
    maxTime: user?.cookingTime || 45,
  });

  const [plan, setPlan] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [busy, setBusy] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [alternatives, setAlternatives] = useState(null);
  const [error, setError] = useState('');

  const updateField = (key) => (e) => {
    const value =
      e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [key]: value });
  };

  const loadOptimization = useCallback((planId) => {
    api
      .get(`/meal-plans/${planId}/optimize`)
      .then((res) => setOptimization(res.data))
      .catch(() => setOptimization(null));
  }, []);

  const openPlan = useCallback(
    async (planId) => {
      try {
        const res = await api.get(`/meal-plans/${planId}`);
        setPlan(res.data);
        loadOptimization(planId);
      } catch (err) {
        toast(errMsg(err), 'error');
      }
    },
    [loadOptimization, toast]
  );

  useEffect(() => {
    if (plans.data?.length && !plan) {
      openPlan(plans.data[0]._id);
    }
  }, [plans.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.meals.length) {
      return setError('Select at least one meal per day');
    }
    if (!(form.days >= 1 && form.days <= 14)) {
      return setError('Days must be between 1 and 14');
    }
    if (!(form.budget > 0)) {
      return setError('Enter a budget greater than 0');
    }

    setBusy(true);
    try {
      const res = await api.post('/meal-plans/generate', form);
      setPlan(res.data);
      loadOptimization(res.data._id);
      plans.reload();
      toast('Meal plan generated');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleMealSlot = (slot) => {
    const nextMeals = form.meals.includes(slot)
      ? form.meals.filter((item) => item !== slot)
      : SLOTS.filter((item) => item === slot || form.meals.includes(item));
    setForm({ ...form, meals: nextMeals });
  };

  const handleReplaceMeal = async (day, slot, recipeId) => {
    try {
      const res = await api.patch(`/meal-plans/${plan._id}/replace`, {
        day,
        slot,
        recipeId,
      });
      setPlan(res.data);
      loadOptimization(plan._id);
      setSwapTarget(null);
      toast('Meal replaced');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const openSwapModal = async (day, slot) => {
    setSwapTarget({ day, slot });
    setAlternatives(null);
    try {
      const res = await api.get(`/meal-plans/${plan._id}/alternatives`, {
        params: { slot },
      });
      setAlternatives(res.data);
    } catch (err) {
      toast(errMsg(err), 'error');
      setSwapTarget(null);
    }
  };

  const handleToggleComplete = async (day, slot, completed) => {
    try {
      await api.patch(`/meal-plans/${plan._id}/complete`, {
        day,
        slot,
        completed,
      });
      setPlan((current) => ({
        ...current,
        days: current.days.map((d) =>
          d.day !== day
            ? d
            : {
                ...d,
                meals: d.meals.map((m) =>
                  m.slot === slot ? { ...m, completed } : m
                ),
              }
        ),
      }));
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleGenerateGrocery = async () => {
    try {
      await api.post('/grocery/generate', { mealPlanId: plan._id });
      toast('Grocery list created');
      navigate('/app/grocery');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const handleDeletePlan = async () => {
    if (!(await confirm('Delete this meal plan and its grocery lists?'))) {
      return;
    }
    try {
      await api.delete(`/meal-plans/${plan._id}`);
      setPlan(null);
      setOptimization(null);
      await plans.reload();
      toast('Plan deleted');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const overBudget = optimization?.exceeded;

  return (
    <div>
      <PageHeader
        title="Meal planner"
        sub="Scored against your diet, goal, allergies, budget, time, and pantry."
      />

      <form
        onSubmit={handleGenerate}
        className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        noValidate
      >
        <Field label="Days (1–14)">
          <input
            className="input"
            type="number"
            min="1"
            max="14"
            value={form.days}
            onChange={updateField('days')}
          />
        </Field>
        <Field label="Total budget (₹)">
          <input
            className="input"
            type="number"
            min="1"
            value={form.budget}
            onChange={updateField('budget')}
          />
        </Field>
        <Field label="Max cooking time (min)">
          <input
            className="input"
            type="number"
            min="5"
            value={form.maxTime}
            onChange={updateField('maxTime')}
          />
        </Field>
        <Field label="Diet">
          <select
            className="input"
            value={form.dietaryPreference}
            onChange={updateField('dietaryPreference')}
          >
            <option value="any">Any</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </Field>
        <Field label="Goal">
          <select
            className="input"
            value={form.goal}
            onChange={updateField('goal')}
          >
            <option value="maintenance">Maintain</option>
            <option value="weight-loss">Lose weight</option>
            <option value="weight-gain">Gain weight</option>
            <option value="muscle-gain">Build muscle</option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <span className="label">Meals per day</span>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((slot) => (
              <button
                type="button"
                key={slot}
                onClick={() => toggleMealSlot(slot)}
                className={`rounded-full border px-3 py-1 text-sm capitalize ${
                  form.meals.includes(slot)
                    ? 'border-leaf-600 bg-leaf-100 text-leaf-800'
                    : 'bg-white'
                }`}
              >
                {EMOJI[slot]} {slot}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Generating…' : '✨ Generate plan'}
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2 lg:col-span-4">
            {error}
          </p>
        )}
      </form>

      {plans.loading ? (
        <Spinner />
      ) : plans.error ? (
        <ErrorBox error={plans.error} onRetry={plans.reload} />
      ) : !plan ? (
        <Empty icon="📅" title="No plan selected">
          Fill in the form above and generate your first meal plan.
        </Empty>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              className="input max-w-xs"
              value={plan._id}
              onChange={(e) => openPlan(e.target.value)}
            >
              {plans.data.map((p) => (
                <option key={p._id} value={p._id}>
                  {new Date(p.startDate).toLocaleDateString('en-IN')} ·{' '}
                  {p.days.length} days · {inr(p.estimatedCost)}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={handleGenerateGrocery}>
              🛒 Generate grocery list
            </button>
            <button className="btn-ghost" onClick={handleDeletePlan}>
              🗑 Delete plan
            </button>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            {[
              ['Calories', plan.totalCalories],
              ['Protein', `${plan.totalProtein} g`],
              ['Est. cost', inr(plan.estimatedCost)],
              ['Budget', inr(plan.budget)],
            ].map(([label, val]) => (
              <div key={label} className="card py-3">
                <div className="text-xs uppercase text-stone-500">{label}</div>
                <div className="font-display text-xl font-bold">{val}</div>
              </div>
            ))}
          </div>

          {overBudget && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="font-semibold text-red-700">
                ⚠️ Budget exceeded — {inr(optimization.total)} vs{' '}
                {inr(optimization.budget)}
              </div>
              {optimization.suggestions.length ? (
                <>
                  <p className="mt-1 text-sm text-red-700">
                    Suggested optimization (new estimate{' '}
                    {inr(optimization.newTotal)}
                    {optimization.withinBudgetAfter
                      ? ''
                      : ' — still above budget, no cheaper options left'}
                    ):
                  </p>
                  <ul className="mt-2 space-y-2">
                    {optimization.suggestions.map((s, idx) => (
                      <li
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm"
                      >
                        <span>
                          Day {s.day} {s.slot}: <b>{s.from.name}</b> (
                          {inr(s.from.cost)}) → <b>{s.to.name}</b> (
                          {inr(s.to.cost)}){' '}
                          <span className="text-leaf-700">
                            saves {inr(s.saving)}
                          </span>
                        </span>
                        <button
                          className="btn-primary py-1"
                          onClick={() =>
                            handleReplaceMeal(s.day, s.slot, s.to.id)
                          }
                        >
                          Accept
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm text-red-700">
                  No cheaper compatible recipes were found.
                </p>
              )}
            </div>
          )}

          {optimization && !overBudget && (
            <div className="mb-4 rounded-2xl bg-leaf-100 p-3 text-sm font-semibold text-leaf-800">
              ✓ Within budget ({inr(optimization.total)} of{' '}
              {inr(optimization.budget)})
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plan.days.map((dayObj) => (
              <div key={dayObj.day} className="card">
                <h3 className="mb-3 font-display text-lg font-bold">
                  Day {dayObj.day}
                </h3>
                <ul className="space-y-3">
                  {dayObj.meals.map((meal) => (
                    <li key={meal.slot} className="rounded-xl bg-stone-50 p-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-leaf-600"
                          checked={Boolean(meal.completed)}
                          onChange={(e) =>
                            handleToggleComplete(
                              dayObj.day,
                              meal.slot,
                              e.target.checked
                            )
                          }
                          aria-label={`Mark ${meal.slot} completed`}
                        />
                        <div className="flex-1">
                          <div className="text-xs uppercase text-stone-500">
                            {EMOJI[meal.slot]} {meal.slot}
                          </div>
                          <Link
                            to={`/app/recipes/${meal.recipe._id}`}
                            className={`font-semibold hover:text-leaf-700 ${
                              meal.completed ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {meal.recipe.name}
                          </Link>
                          <div className="text-xs text-stone-500">
                            {meal.recipe.calories} kcal · {meal.recipe.protein}{' '}
                            g protein · {inr(meal.recipe.estimatedCost)}
                          </div>
                        </div>
                        <button
                          className="text-xs font-semibold text-leaf-700 hover:underline"
                          onClick={() => openSwapModal(dayObj.day, meal.slot)}
                        >
                          Replace
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {swapTarget && (
        <Modal
          title={`Replace ${swapTarget.slot} (Day ${swapTarget.day})`}
          onClose={() => setSwapTarget(null)}
          wide
        >
          {!alternatives ? (
            <Spinner />
          ) : !alternatives.length ? (
            <p className="text-sm text-stone-500">
              No other compatible recipes available.
            </p>
          ) : (
            <ul className="space-y-2">
              {alternatives.map((alt) => (
                <li
                  key={alt._id}
                  className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm"
                >
                  <div>
                    <b>{alt.name}</b>
                    <div className="text-xs text-stone-500">
                      {alt.calories} kcal · {alt.protein} g ·{' '}
                      {inr(alt.estimatedCost)} · match {alt.score}/100
                    </div>
                  </div>
                  <button
                    className="btn-primary py-1"
                    onClick={() =>
                      handleReplaceMeal(
                        swapTarget.day,
                        swapTarget.slot,
                        alt._id
                      )
                    }
                  >
                    Use this
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
