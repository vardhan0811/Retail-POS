import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from './auth.service';
import { UserStatus } from './auth.models';

/**
 * Strictly protects the /access-pending route.
 * - Guest (Unauthenticated) -> Redirect to landing (/)
 * - Fully Assigned -> Redirect to Dashboard
 * - Missing store/role -> Allow access
 */
export const accessPendingGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	return auth.isAuthInitialized$.pipe(
		filter(init => init),
		take(1),
		map(() => {
			const identity = auth.identity;

			// 1. Guest (Unauthenticated) -> Redirect to landing (/)
			if (!identity || !identity.token) {
				auth.logout('/');
				return false;
			}

			const { role, storeId, status } = identity;
			const isAdmin = role === 'Admin' || role === 'Manager';
			const isCashierWithStore = role === 'Cashier' && !!storeId;

			// 2. Fully Assigned & Active -> Redirect to dashboard (Escape /access-pending)
			if (status === UserStatus.Active && (isAdmin || isCashierWithStore)) {
				auth.redirectAfterLogin(identity);
				return false;
			}

			// 3. Pending/Rejected/Unassigned -> Allow access to /access-pending
			return true;
		})
	);
};
