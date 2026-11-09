import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useUI } from '../context/UI';
import { Spinner, ErrorBox, EMOJI, inr } from '../components/common';

export default function RecipeDetail() {
  const { id } = useParams();
  const { toast } = useUI();
  const {
    data: recipe,
    loading,
    error,
    reload,
  } = useFetch(() => api.get(`/recipes/${id}`), [id]);

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    api
      .get('/favorites')
      .then((res) => {
        const matched = res.data.some((fav) => fav.recipeId?._id === id);
        setIsFavorite(matched);
      })
      .catch(() => {});
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`);
      } else {
        await api.post(`/favorites/${id}`);
      }
      setIsFavorite(!isFavorite);
      toast(isFavorite ? 'Removed from favorites' : 'Saved to favorites');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const quickStats = [
    ['Time', `${recipe.cookingTime} min`],
    ['Calories', recipe.calories],
    ['Protein', `${recipe.protein} g`],
    ['Carbs/Fats', `${recipe.carbohydrates}/${recipe.fats} g`],
    ['Cost', inr(recipe.estimatedCost)],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/recipes" className="text-sm font-semibold text-leaf-700">
        ← All recipes
      </Link>

      <div className="mt-3 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf-100 to-tang-100 text-7xl">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="h-full w-full rounded-2xl object-cover"
          />
        ) : (
          EMOJI[recipe.category]
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{recipe.name}</h1>
          <p className="text-stone-500">{recipe.description}</p>
        </div>
        <button className="btn-ghost" onClick={handleToggleFavorite}>
          {isFavorite ? '❤️ Saved' : '🤍 Save'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {(recipe.dietaryTags || []).map((tag) => (
          <span key={tag} className="badge">
            {tag}
          </span>
        ))}
        <span className="badge bg-tang-100 text-tang-600">
          {recipe.cuisine}
        </span>
        <span className="badge bg-stone-100 text-stone-700">
          {recipe.category}
        </span>
      </div>

      <div className="my-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
        {quickStats.map(([label, val]) => (
          <div key={label} className="card py-3">
            <div className="text-xs uppercase text-stone-500">{label}</div>
            <div className="font-bold">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-display text-lg font-bold">Ingredients</h2>
          <ul className="space-y-1 text-sm">
            {(recipe.ingredients || []).map((ing) => (
              <li
                key={ing._id || ing.name}
                className="flex justify-between border-b border-stone-100 py-1"
              >
                <span className="capitalize">{ing.name}</span>
                <span className="text-stone-500">
                  {ing.quantity} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="mb-2 font-display text-lg font-bold">Instructions</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {(recipe.instructions || []).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
