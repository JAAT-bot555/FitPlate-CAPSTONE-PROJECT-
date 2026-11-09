import { useState, useEffect } from 'react';
import api, { errMsg } from '../services/api';
import { useUI } from '../context/UI';
import RecipeCard from '../components/RecipeCard';
import { Spinner, ErrorBox, Empty, PageHeader } from '../components/common';

const CUISINES = ['North Indian', 'Punjabi', 'South Indian', 'Continental'];
const TAGS = ['vegetarian', 'vegan', 'non-veg', 'high-protein', 'budget'];
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];
const PAGE_LIMIT = 12;

export default function Recipes() {
  const { toast } = useUI();

  const [filters, setFilters] = useState({
    q: '',
    cuisine: '',
    tag: '',
    category: '',
    maxTime: '',
    maxCalories: '',
    maxCost: '',
    sort: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    api
      .get('/favorites')
      .then((res) => {
        const ids = res.data
          .filter((item) => item.recipeId)
          .map((item) => item.recipeId._id);
        setFavoriteIds(new Set(ids));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = Object.fromEntries(
      Object.entries({ ...filters, page, limit: PAGE_LIMIT }).filter(
        ([, val]) => val !== ''
      )
    );

    api
      .get('/recipes', { params })
      .then((res) => {
        if (active) setResult(res.data);
      })
      .catch((err) => {
        if (active) setError(errMsg(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, page, reloadTick]);

  const updateFilter = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  const handleToggleFavorite = async (recipeId) => {
    const isFav = favoriteIds.has(recipeId);
    try {
      if (isFav) {
        await api.delete(`/favorites/${recipeId}`);
      } else {
        await api.post(`/favorites/${recipeId}`);
      }
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.delete(recipeId);
        } else {
          next.add(recipeId);
        }
        return next;
      });
      toast(isFav ? 'Removed from favorites' : 'Saved to favorites');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_LIMIT)) : 1;

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({
      q: '',
      cuisine: '',
      tag: '',
      category: '',
      maxTime: '',
      maxCalories: '',
      maxCost: '',
      sort: '',
    });
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Recipe explorer"
        sub={result ? `${result.total} recipes` : ''}
      />

      <div className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="input sm:col-span-2"
          placeholder="🔍 Search recipes…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="input"
          value={filters.cuisine}
          onChange={updateFilter('cuisine')}
        >
          <option value="">All cuisines</option>
          {CUISINES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className="input"
          value={filters.tag}
          onChange={updateFilter('tag')}
        >
          <option value="">All diet types</option>
          {TAGS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          className="input"
          value={filters.category}
          onChange={updateFilter('category')}
        >
          <option value="">All meals</option>
          {MEAL_TYPES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Max time (min)"
          value={filters.maxTime}
          onChange={updateFilter('maxTime')}
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Max calories"
          value={filters.maxCalories}
          onChange={updateFilter('maxCalories')}
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Max cost (₹)"
          value={filters.maxCost}
          onChange={updateFilter('maxCost')}
        />
        <select
          className="input"
          value={filters.sort}
          onChange={updateFilter('sort')}
        >
          <option value="">Sort: name</option>
          <option value="cost">Sort: lowest cost</option>
          <option value="protein">Sort: highest protein</option>
        </select>
        <button className="btn-ghost" onClick={handleResetFilters}>
          Reset filters
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox
          error={error}
          onRetry={() => setReloadTick((tick) => tick + 1)}
        />
      ) : !result.items.length ? (
        <Empty icon="🔎" title="No recipes match">
          Try removing a filter.
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                r={recipe}
                fav={favoriteIds.has(recipe._id)}
                onFav={handleToggleFavorite}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
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
    </div>
  );
}
