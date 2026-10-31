import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AjustesPage, ComprasPage, ElegirPage, KitchenMode, RecetasPage, RecipeDetail } from './pages';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ElegirPage /> },
      { path: 'recetas', element: <RecetasPage /> },
      { path: 'recetas/:recipeId', element: <RecipeDetail /> },
      { path: 'recetas/:recipeId/cocina', element: <KitchenMode /> },
      { path: 'compras', element: <ComprasPage /> },
      { path: 'ajustes', element: <AjustesPage /> },
      // Old bookmarks from the soup-only version.
      { path: 'sopas/*', element: <Navigate to="/recetas" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
