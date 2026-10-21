import { createHashRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AjustesPage, HoyPage, KitchenMode, RecipeDetail, SopasPage } from './pages';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HoyPage /> },
      { path: 'sopas', element: <SopasPage /> },
      { path: 'sopas/:recipeId', element: <RecipeDetail /> },
      { path: 'sopas/:recipeId/cocina', element: <KitchenMode /> },
      { path: 'ajustes', element: <AjustesPage /> },
    ],
  },
];

export function createAppRouter() {
  return createHashRouter(routes);
}
