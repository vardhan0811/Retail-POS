import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { filter, map, take } from 'rxjs';

import { AuthService } from './auth.service';
import { UserStatus } from './auth.models';

export const authGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);
	const platformId = inject(PLATFORM_ID);

	if (isPlatformServer(platformId)) return true;

	return auth.isAuthInitialized$.pipe(
		filter(init => init),
		take(1),
		map(() => {
			if (!auth.isAuthenticated) {
				return router.createUrlTree(['/login']);
			}

      // 🛡️ Block Pending/Unassigned users from accessing protected areas
      const identity = auth.identity;
      const isPending = identity?.status === UserStatus.PendingApproval;
      const isAdmin = identity?.role === 'Admin' || identity?.role === 'Manager';
      const isCashierWithStore = identity?.role === 'Cashier' && !!identity?.storeId && identity?.storeId !== '00000000-0000-0000-0000-000000000000';

      if (isPending || (!isAdmin && !isCashierWithStore)) {
        console.warn('[AuthGuard] Access denied - redirecting to pending', { isPending, isAdmin, isCashierWithStore });
        return router.createUrlTree(['/access-pending']);
      }

			return true;
		})
	);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.identity?.role;

  // 🧠 Admin area only for Admin/Manager
  if (role === 'Admin' || role === 'Manager') {
    return true;
  }

  // Fallback based on role
  if (role === 'Cashier') {
    return router.createUrlTree(['/pos']);
  }

  return router.createUrlTree(['/login']);
};

export const posGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.identity?.role;

  // 🧠 POS area for Cashiers OR Admins (who specifically started a session)
  if (role === 'Cashier') {
    return true;
  }

  // Admins only allowed if they have an active sessionId (started from dashboard)
  if ((role === 'Admin' || role === 'Manager') && auth.identity?.sessionId) {
    return true;
  }

  // Fallback for Admin
  if (role === 'Admin' || role === 'Manager') {
    return router.createUrlTree(['/admin']);
  }

  return router.createUrlTree(['/login']);
};
