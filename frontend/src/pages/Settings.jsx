import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/Auth';
import { useUI } from '../context/UI';
import { PageHeader, Field } from '../components/common';

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      return setError('New password must be at least 8 characters');
    }
    if (form.newPassword !== form.confirm) {
      return setError('Passwords do not match');
    }

    setBusy(true);
    try {
      await api.put('/users/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast('Password changed');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Settings"
        sub={`Signed in as ${user.email} (${user.role})`}
      />

      <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
        <h3 className="font-semibold">Change password</h3>
        <Field label="Current password">
          <input
            className="input"
            type="password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm({ ...form, currentPassword: e.target.value })
            }
          />
        </Field>
        <Field label="New password">
          <input
            className="input"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            className="input"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button className="btn-primary" disabled={busy}>
          Update password
        </button>
      </form>

      <div className="card mt-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Session</h3>
          <p className="text-sm text-stone-500">Log out of this device.</p>
        </div>
        <button
          className="btn-ghost"
          onClick={async () => {
            if (await confirm('Log out now?')) {
              logout();
              navigate('/');
            }
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
