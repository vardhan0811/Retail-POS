import { Routes } from '@angular/router';

import { authGuard, adminGuard, posGuard } from './core/auth.guard';
import { roleGuard, roleMatchGuard } from './core/role.guard';
import { accessPendingGuard } from './core/access-pending.guard';


export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.routes').then(m => m.routes)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    canMatch: [roleMatchGuard],
    data: { roles: ['Admin'] },
    loadComponent: () => import('./admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    loadChildren: () => import('./admin/admin.routes').then(m => m.routes)
  },
  {
    path: 'pos',
    canActivate: [authGuard, posGuard],
    data: { roles: ['Cashier', 'Admin'] },
    loadChildren: () => import('./pos/pos.routes').then(m => m.POS_ROUTES)
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./shared/pages/access-denied/access-denied.component').then(m => m.AccessDeniedComponent)
  },
  {
    path: 'access-pending',
    canActivate: [accessPendingGuard],
    loadComponent: () =>
      import('./shared/pages/access-pending/access-pending.component').then(m => m.AccessPendingComponent)
  },
  {
    path: '404',
    loadComponent: () => import('./shared/pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: '**',
    loadComponent: () => import('./shared/pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
