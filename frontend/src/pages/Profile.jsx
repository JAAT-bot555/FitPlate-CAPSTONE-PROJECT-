import { useState } from 'react';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/Auth';
import { useUI } from '../context/UI';
import { PageHeader, Field } from '../components/common';

const CUISINES = ['', 'North Indian', 'Punjabi', 'South Indian', 'Continental'];

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useUI();

  const [form, setForm] = useState({
    name: user.name,
    age: user.age ?? '',
    gender: user.gender || '',
    dietaryPreference: user.dietaryPreference,
    fitnessGoal: user.fitnessGoal,
    allergies: (user.allergies || []).join(', '),
    dislikes: (user.dislikes || []).join(', '),
    preferredCuisine: user.preferredCuisine || '',
    budget: user.budget,
    cookingTime: user.cookingTime,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const parseCommaList = (str) =>
    str
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      return setError('Name is required');
    }
    if (form.age !== '' && !(form.age >= 5 && form.age <= 110)) {
      return setError('Enter a realistic age (5–110)');
    }
    if (!(Number(form.budget) > 0)) {
      return setError('Budget must be greater than 0');
    }
    if (!(Number(form.cookingTime) >= 5)) {
      return setError('Cooking time must be at least 5 minutes');
    }

    setBusy(true);
    try {
      const res = await api.put('/users/profile', {
        ...form,
        age: form.age === '' ? undefined : Number(form.age),
        budget: Number(form.budget),
        cookingTime: Number(form.cookingTime),
        allergies: parseCommaList(form.allergies),
        dislikes: parseCommaList(form.dislikes),
      });
      setUser(res.data);
      toast('Profile saved');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Your profile"
        sub="These settings drive every recommendation."
      />

      <form
        onSubmit={handleSubmit}
        className="card grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <Field label="Name">
          <input
            className="input"
            value={form.name}
            onChange={updateField('name')}
          />
        </Field>
        <Field label="Email">
          <input
            className="input bg-stone-100"
            value={user.email}
            disabled
          />
        </Field>
        <Field label="Age">
          <input
            className="input"
            type="number"
            value={form.age}
            onChange={updateField('age')}
          />
        </Field>
        <Field label="Gender (optional)">
          <select
            className="input"
            value={form.gender}
            onChange={updateField('gender')}
          >
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Dietary preference">
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
        <Field label="Fitness goal">
          <select
            className="input"
            value={form.fitnessGoal}
            onChange={updateField('fitnessGoal')}
          >
            <option value="maintenance">Maintain</option>
            <option value="weight-loss">Lose weight</option>
            <option value="weight-gain">Gain weight</option>
            <option value="muscle-gain">Build muscle</option>
          </select>
        </Field>
        <Field label="Allergies (comma separated)">
          <input
            className="input"
            placeholder="peanut, egg"
            value={form.allergies}
            onChange={updateField('allergies')}
          />
        </Field>
        <Field label="Dislikes (comma separated)">
          <input
            className="input"
            placeholder="brinjal"
            value={form.dislikes}
            onChange={updateField('dislikes')}
          />
        </Field>
        <Field label="Preferred cuisine">
          <select
            className="input"
            value={form.preferredCuisine}
            onChange={updateField('preferredCuisine')}
          >
            {CUISINES.map((cuisine) => (
              <option key={cuisine} value={cuisine}>
                {cuisine || 'No preference'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Default budget (₹)">
          <input
            className="input"
            type="number"
            value={form.budget}
            onChange={updateField('budget')}
          />
        </Field>
        <Field label="Max cooking time (min)">
          <input
            className="input"
            type="number"
            value={form.cookingTime}
            onChange={updateField('cookingTime')}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
