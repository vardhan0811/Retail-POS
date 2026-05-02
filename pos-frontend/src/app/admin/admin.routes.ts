import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    title: 'Dashboard',
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users.component').then(m => m.AdminUsersComponent),
    title: 'Users',
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./users/user-details.component').then(m => m.AdminUserDetailsComponent),
    title: 'User details',
  },
  {
    path: 'stores',
    loadComponent: () => import('./stores/stores.component').then(m => m.AdminStoresComponent),
    title: 'Stores',
  },
  {
    path: 'stores/:id',
    loadComponent: () => import('./stores/store-details.component').then(m => m.AdminStoreDetailsComponent),
    title: 'Store details',
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then(m => m.AdminReportsComponent),
    title: 'Reports',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./catalog/catalog.component').then(m => m.AdminCatalogComponent),
    title: 'Product Catalog',
  },
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory.component').then(m => m.AdminInventoryComponent),
    title: 'Stock Management',
  },
  {
    path: 'refund-requests',
    loadComponent: () => import('./refund-requests/refund-requests.component').then(m => m.RefundRequestsComponent),
    title: 'Refund Approvals',
  },
  {
    path: 'bills/:id',
    loadComponent: () => import('./reports/bill-details.component').then(m => m.AdminBillDetailsComponent),
    title: 'Transaction Audit',
  },
];