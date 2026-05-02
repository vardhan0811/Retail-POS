import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartService } from './cart.service';

export const cartGuard: CanActivateFn = () => {
    const cart = inject(CartService);
    const router = inject(Router);
    if(cart.items().length > 0) {
        return true;
    }
    
    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Cart is empty. Redirecting to POS.' }));
    return router.parseUrl('/pos');
};
