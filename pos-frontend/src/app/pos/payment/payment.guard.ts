import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const paymentGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const router = inject(Router);
    if(route.paramMap.has('id')) {
        return true;
    }
    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Missing Bill context. Redirecting.' }));
    return router.parseUrl('/pos');
};
