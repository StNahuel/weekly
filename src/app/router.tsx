import { createHashRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AjustesPage, CocinarPage, ComprarPage, HoyPage, KitchenMode, QueComoPage, RecipeDetail } from './pages';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HoyPage /> },
      { path: 'que-como', element: <QueComoPage /> },
      { path: 'cocinar', element: <CocinarPage /> },
      { path: 'cocinar/:recipeId', element: <RecipeDetail /> },
      { path: 'cocinar/:recipeId/cocina', element: <KitchenMode /> },
      { path: 'comprar', element: <ComprarPage /> },
      { path: 'ajustes', element: <AjustesPage /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
