import { lazy } from 'react';

export const ElegirPage = lazy(() => import('../features/elegir/ElegirPage'));
export const RecetasPage = lazy(() => import('../features/recetas/RecetasPage'));
export const RecipeDetail = lazy(() => import('../features/recetas/RecipeDetail'));
export const KitchenMode = lazy(() => import('../features/recetas/KitchenMode'));
export const ComprasPage = lazy(() => import('../features/compras/ComprasPage'));
export const AjustesPage = lazy(() => import('../features/ajustes/AjustesPage'));
