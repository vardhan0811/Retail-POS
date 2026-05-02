import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * If the user is already authenticated, keep them out of /login and route them
 * to the correct shell based on their stored role.
 */
export const loginRedirectGuard: CanMatchFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	if (!auth.isAuthenticated) return true;

	if (auth.role === 'Admin') return router.parseUrl('/admin');
	if (auth.role === 'Cashier') return router.parseUrl('/pos');

	// Unknown role: let them re-authenticate.
	return true;
};
