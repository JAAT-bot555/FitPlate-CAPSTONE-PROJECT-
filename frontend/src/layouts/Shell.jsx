import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Auth';

const USER_NAV = [
  ['/app/dashboard', '🏠', 'Dashboard'],
  ['/app/planner', '📅', 'Meal Planner'],
  ['/app/recipes', '📖', 'Recipes'],
  ['/app/pantry', '🥫', 'Pantry'],
  ['/app/grocery', '🛒', 'Grocery List'],
  ['/app/nutrition', '📊', 'Nutrition'],
  ['/app/tracker', '📈', 'Food & Body Tracker'],
  ['/app/assistant', '🤖', 'AI Assistant'],
  ['/app/favorites', '❤️', 'Favorites'],
  ['/app/profile', '👤', 'Profile'],
  ['/app/settings', '⚙️', 'Settings'],
];

const ADMIN_NAV = [
  ['/admin', '📈', 'Overview'],
  ['/admin/users', '👥', 'Users'],
  ['/admin/recipes', '📖', 'Recipes'],
  ['/admin/ingredients', '🥕', 'Ingredients & Categories'],
];

export default function Shell({ admin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = admin ? ADMIN_NAV : USER_NAV;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen lg:flex">
      <header className="no-print flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
        <Link to="/" className="font-display text-lg font-bold text-leaf-700">
          🥗 FitPlate
        </Link>
        <button
          aria-label="Menu"
          className="btn-ghost px-3"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </header>

      <aside
        className={`no-print ${
          menuOpen ? 'block' : 'hidden'
        } w-full shrink-0 border-r bg-white p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:overflow-y-auto`}
      >
        <Link
          to="/"
          className="mb-6 hidden font-display text-xl font-bold text-leaf-700 lg:block"
        >
          🥗 FitPlate
        </Link>

        {admin && (
          <div className="mb-3 rounded-lg bg-tang-100 px-3 py-1 text-xs font-bold uppercase text-tang-600">
            Admin panel
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map(([to, icon, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-leaf-100 text-leaf-800'
                    : 'text-stone-600 hover:bg-stone-100'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t pt-4 text-sm">
          <div className="font-semibold">{user?.name}</div>
          <div className="mb-3 text-xs text-stone-500">{user?.email}</div>
          {user?.role === 'admin' && (
            <Link
              to={admin ? '/app/dashboard' : '/admin'}
              className="btn-ghost mb-2 w-full"
            >
              {admin ? 'User view' : 'Admin panel'}
            </Link>
          )}
          <button className="btn-ghost w-full" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
