import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useUI } from '../context/UI';
import RecipeCard from '../components/RecipeCard';
import { Spinner, ErrorBox, Empty, PageHeader } from '../components/common';

export default function Favorites() {
  const { toast } = useUI();
  const { data, loading, error, reload } = useFetch(() =>
    api.get('/favorites')
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const savedFavorites = data.filter((fav) => fav.recipeId);

  const handleRemoveFavorite = async (recipeId) => {
    try {
      await api.delete(`/favorites/${recipeId}`);
      toast('Removed');
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Favorites" sub={`${savedFavorites.length} saved`} />

      {!savedFavorites.length ? (
        <Empty icon="❤️" title="No favorites yet">
          Tap the heart on any recipe.{' '}
          <Link className="font-semibold text-leaf-700" to="/app/recipes">
            Browse recipes →
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedFavorites.map((fav) => (
            <RecipeCard
              key={fav._id}
              r={fav.recipeId}
              fav
              onFav={handleRemoveFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
