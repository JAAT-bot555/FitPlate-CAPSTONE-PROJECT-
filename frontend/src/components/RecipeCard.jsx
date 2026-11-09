import { Link } from 'react-router-dom';
import { EMOJI, inr } from './common';

export default function RecipeCard({ r, fav, onFav }) {
  return (
    <div className="card flex flex-col overflow-hidden p-0 transition hover:shadow-md">
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-leaf-100 to-tang-100 text-5xl">
        {EMOJI[r.category]}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/app/recipes/${r._id}`}
            className="font-semibold hover:text-leaf-700"
          >
            {r.name}
          </Link>
          {onFav && (
            <button
              aria-label="Toggle favorite"
              onClick={() => onFav(r._id)}
              className="text-lg"
            >
              {fav ? '❤️' : '🤍'}
            </button>
          )}
        </div>
        <div className="mt-1 text-xs text-stone-500">
          {r.cuisine} · {r.category} · {r.cookingTime} min
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {(r.dietaryTags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="badge">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2 pt-4 text-center text-xs">
          <div>
            <b className="block text-sm">{r.calories}</b>
            kcal
          </div>
          <div>
            <b className="block text-sm">{r.protein}g</b>
            protein
          </div>
          <div>
            <b className="block text-sm">{inr(r.estimatedCost)}</b>
            cost
          </div>
        </div>
      </div>
    </div>
  );
}
