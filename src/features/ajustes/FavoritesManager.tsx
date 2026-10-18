import { Star } from 'lucide-react';
import { useId } from 'react';
import { Loading } from '../../app/states/Loading';
import { removeFavorite } from '../../db/repo';
import { useFavorites } from '../shared/useFavorites';
import { CARD } from './copy';

export function FavoritesManager() {
  const headingId = useId();
  const favorites = useFavorites();

  return (
    <section aria-labelledby={headingId} className={CARD}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <Star aria-hidden="true" size={20} className="text-gold" />
        Favoritos
      </h2>
      {!favorites ? (
        <Loading />
      ) : favorites.length === 0 ? (
        <p className="mt-2 text-muted">No tenés favoritos. Marcalos con la estrella en ¿Qué como?</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                {favorite.title}
                {favorite.source === 'seed' && (
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs text-muted">Predeterminado</span>
                )}
              </span>
              <button
                type="button"
                aria-label={`Quitar ${favorite.title}`}
                onClick={() => void removeFavorite(favorite.id)}
                className="tap shrink-0 rounded-xl border border-border px-4 font-semibold"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
