import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/Auth';
import { Spinner } from './components/common';
import Shell from './layouts/Shell';
import Landing from './pages/Landing';
import { Login, Register } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Pantry from './pages/Pantry';
import Grocery from './pages/Grocery';
import Nutrition from './pages/Nutrition';
import Tracker from './pages/Tracker';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Assistant from './pages/Assistant';
import {
  AdminOverview,
  AdminUsers,
  AdminRecipes,
  AdminIngredients,
} from './pages/Admin';

function Guard({ admin, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (admin && user.role !== 'admin') {
    return <Navigate to="/app/dashboard" replace />;
  }
  return children;
}

function NotFound() {
  return (
    <div className="p-16 text-center">
      <h1 className="font-display text-3xl font-bold">404</h1>
      <p className="text-stone-500">Page not found.</p>
      <a className="btn-primary mt-4" href="/">
        Go home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/app"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="planner" element={<Planner />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />
        <Route path="pantry" element={<Pantry />} />
        <Route path="grocery" element={<Grocery />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route
        path="/admin"
        element={
          <Guard admin>
            <Shell admin />
          </Guard>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="recipes" element={<AdminRecipes />} />
        <Route path="ingredients" element={<AdminIngredients />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
