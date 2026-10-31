import { safeLazyImport } from '../components/affine/affine-error-boundary/affine-error-fallback';
import type { RouteObject } from 'react-router-dom';

export const workbenchRoutes = [
  {
    path: '/all',
    lazy: safeLazyImport(() => import('./pages/workspace/all-page/all-page')),
  },
  {
    path: '/projects/*',
    lazy: safeLazyImport(() => import('./pages/workspace/projects')),
  },
  {
    path: '/collection',
    lazy: safeLazyImport(() => import('./pages/workspace/all-collection')),
  },
  {
    path: '/collection/:collectionId',
    lazy: safeLazyImport(() => import('./pages/workspace/collection/index')),
  },
  {
    path: '/tag',
    lazy: safeLazyImport(() => import('./pages/workspace/all-tag')),
  },
  {
    path: '/tag/:tagId',
    lazy: safeLazyImport(() => import('./pages/workspace/tag')),
  },
  {
    path: '/trash',
    lazy: safeLazyImport(() => import('./pages/workspace/trash-page')),
  },
  {
    path: '/:pageId',
    lazy: safeLazyImport(() => import('./pages/workspace/detail-page/detail-page')),
  },
  {
    path: '/:pageId/attachments/:attachmentId',
    lazy: safeLazyImport(() => import('./pages/workspace/attachment/index')),
  },
  {
    path: '/journals',
    lazy: safeLazyImport(() => import('./pages/journals')),
  },
  {
    path: '/dashboard',
    lazy: safeLazyImport(() => import('./pages/workspace/dashboard')),
  },
  {
    path: '/products',
    lazy: safeLazyImport(() => import('./pages/workspace/products')),
  },
  {
    path: '/plans',
    lazy: safeLazyImport(() => import('./pages/workspace/plans')),
  },
  {
    path: '/proposals',
    lazy: safeLazyImport(() => import('./pages/workspace/proposals')),
  },
  {
    path: '/quotes',
    lazy: safeLazyImport(() => import('./pages/workspace/quotes')),
  },
  {
    path: '/subscriptions',
    lazy: safeLazyImport(() => import('./pages/workspace/subscriptions')),
  },
  {
    path: '/invoices',
    lazy: safeLazyImport(() => import('./pages/workspace/invoices')),
  },
  {
    path: '/discounts',
    lazy: safeLazyImport(() => import('./pages/workspace/discounts')),
  },
  {
    path: '/payments',
    lazy: safeLazyImport(() => import('./pages/workspace/payments')),
  },
  {
    path: '/letterheads',
    lazy: safeLazyImport(() => import('./pages/workspace/letterheads')),
  },
  {
    path: '/settings',
    lazy: safeLazyImport(() => import('./pages/workspace/settings')),
  },
  {
    path: '*',
    lazy: safeLazyImport(() => import('./pages/404')),
  },
] satisfies RouteObject[];
