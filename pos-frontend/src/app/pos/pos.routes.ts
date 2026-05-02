import { Routes } from '@angular/router';
import { cartGuard } from './cart/cart.guard';
import { paymentGuard } from './payment/payment.guard';
import { PendingPaymentGuard } from '../core/pending-payment.guard';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pos-layout.component').then(m => m.PosLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pos-shell/pos-shell.component').then(m => m.PosShellComponent) },
      { path: 'bills', loadComponent: () => import('./bills').then(m => m.BillsComponent) },
      { path: 'bills/:billId', loadComponent: () => import('./bills').then(m => m.BillsComponent) },
      { path: 'refunds', loadComponent: () => import('./refunds/refunds.component').then(m => m.RefundsComponent) },
      { path: 'cart', loadComponent: () => import('./cart').then(m => m.CartComponent) },
      { 
        path: 'checkout', 
        canActivate: [cartGuard],
        data: { hideHeader: true },
        loadComponent: () => import('./checkout').then(m => m.CheckoutComponent) 
      },
      { 
        path: 'payment/:id', 
        canActivate: [paymentGuard],
        canDeactivate: [PendingPaymentGuard],
        data: { hideHeader: true },
        loadComponent: () => import('./payment').then(m => m.PaymentComponent) 
      },
      { 
        path: 'bill/:id', 
        data: { hideHeader: true },
        loadComponent: () => import('./bill-details').then(m => m.BillDetailsComponent) 
      },
      { 
        path: 'profile', 
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent) 
      }
    ]
  }
];
