import { lazy } from 'react';

export const HoyPage = lazy(() => import('../features/hoy/HoyPage'));
export const QueComoPage = lazy(() => import('../features/quecomo/QueComoPage'));
export const CocinarPage = lazy(() => import('../features/cocinar/CocinarPage'));
export const RecipeDetail = lazy(() => import('../features/cocinar/RecipeDetail'));
export const KitchenMode = lazy(() => import('../features/cocinar/KitchenMode'));
export const ComprarPage = lazy(() => import('../features/comprar/ComprarPage'));
export const AjustesPage = lazy(() => import('../features/ajustes/AjustesPage'));
