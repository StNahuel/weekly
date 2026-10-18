import { Star } from 'lucide-react';
import type { FavoriteRecord } from '../../db/types';

type FavoritesListProps = { favorites: readonly FavoriteRecord[]; onUse: (favorite: FavoriteRecord) => void };

export function FavoritesList({ favorites, onUse }: FavoritesListProps) {
  return (
    <section aria-labelledby="favorites-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="favorites-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Star aria-hidden="true" size={20} className="text-gold" />
        Favoritos
      </h2>
      {favorites.length === 0 ? (
        <p className="mt-2 text-muted">Todavía no marcaste favoritos.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {favorites.map((favorite) => (
            <li key={favorite.id} className="flex items-center justify-between gap-3 py-2">
              <span>{favorite.title}</span>
              <button
                type="button"
                aria-label={`Usar ${favorite.title}`}
                onClick={() => onUse(favorite)}
                className="tap shrink-0 rounded-xl border border-border px-4 font-semibold text-sage"
              >
                Usar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
