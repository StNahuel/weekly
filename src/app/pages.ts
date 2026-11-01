import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'weekly.chunkReload';

// After a deploy the new service worker drops the old build's chunks; a page still running the old
// build then fails to load a lazy route. Reload once to pick up the new build instead of erroring.
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    try {
      const page = await load();
      sessionStorage.removeItem(RELOAD_KEY);
      return page;
    } catch (error) {
      if (sessionStorage.getItem(RELOAD_KEY) === null) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  });
}

export const ElegirPage = lazyPage(() => import('../features/elegir/ElegirPage'));
export const RecetasPage = lazyPage(() => import('../features/recetas/RecetasPage'));
export const RecipeDetail = lazyPage(() => import('../features/recetas/RecipeDetail'));
export const KitchenMode = lazyPage(() => import('../features/recetas/KitchenMode'));
export const ComprasPage = lazyPage(() => import('../features/compras/ComprasPage'));
export const AjustesPage = lazyPage(() => import('../features/ajustes/AjustesPage'));
