import { Star } from 'lucide-react';
import { BTN_PRIMARY, CARD } from '../../app/ui';
import type { FavoriteRecord } from '../../db/types';

type FavoritesListProps = { favorites: readonly FavoriteRecord[]; onUse: (favorite: FavoriteRecord) => void };

export function FavoritesList({ favorites, onUse }: FavoritesListProps) {
  return (
    <section aria-labelledby="favorites-heading" className={CARD}>
      <h2 id="favorites-heading" className="flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/50 text-text">
          <Star aria-hidden="true" size={20} fill="currentColor" />
        </span>
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
                className={`${BTN_PRIMARY} shrink-0`}
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
