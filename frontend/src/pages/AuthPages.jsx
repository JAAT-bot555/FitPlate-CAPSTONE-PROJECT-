import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/Auth';
import { errMsg } from '../services/api';
import { Field } from '../components/common';

function AuthFrame({ title, sub, children, foot }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-leaf-50 via-white to-tang-50 p-4">
      <div className="card w-full max-w-md p-8">
        <Link to="/" className="font-display text-xl font-bold text-leaf-700">
          🥗 FitPlate
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-sm text-stone-500">{sub}</p>
        {children}
        <p className="mt-6 text-center text-sm text-stone-500">{foot}</p>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError('Enter a valid email address');
    }
    if (!form.password) {
      return setError('Enter your password');
    }

    setBusy(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      const target =
        location.state?.from ||
        (loggedInUser.role === 'admin' ? '/admin' : '/app/dashboard');
      navigate(target, { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Welcome back"
      sub="Log in to your meal plans."
      foot={
        <>
          New here?{' '}
          <Link className="font-semibold text-leaf-700" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() =>
              setForm({ email: 'demo@fitplate.com', password: 'Demo@12345' })
            }
          >
            Fill demo user
          </button>
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() =>
              setForm({ email: 'admin@fitplate.com', password: 'Admin@12345' })
            }
          >
            Fill demo admin
          </button>
        </div>
      </form>
    </AuthFrame>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dietaryPreference: 'any',
    fitnessGoal: 'maintenance',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      return setError('Please enter your name');
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return setError('Enter a valid email address');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setBusy(true);
    try {
      await register(form);
      navigate('/app/profile', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Create your account"
      sub="Takes under a minute."
      foot={
        <>
          Already registered?{' '}
          <Link className="font-semibold text-leaf-700" to="/login">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Name">
          <input
            className="input"
            value={form.name}
            onChange={updateField('name')}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={updateField('email')}
          />
        </Field>
        <Field label="Password (min 8 characters)">
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="new-password"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
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
              value={form.fitnessGoal}
              onChange={updateField('fitnessGoal')}
            >
              <option value="maintenance">Maintain</option>
              <option value="weight-loss">Lose weight</option>
              <option value="weight-gain">Gain weight</option>
              <option value="muscle-gain">Build muscle</option>
            </select>
          </Field>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  );
}
