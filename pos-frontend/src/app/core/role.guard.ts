import { CanActivateFn, CanMatchFn, ActivatedRouteSnapshot, Route, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

import { AuthService } from './auth.service';

const checkRole = (data: any, auth: AuthService, platformId: any): boolean => {
	// Skip role check on server as we don't have the token/role context yet.
	if (isPlatformServer(platformId)) return true;

	const allowed = (data?.['roles'] as string[] | undefined) ?? [];
	const role = auth.role;

	if (!auth.isAuthenticated) return false;
	if (allowed.length === 0) return true;
	return role ? allowed.includes(role) : false;
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
	return checkRole(route.data, inject(AuthService), inject(PLATFORM_ID));
};

export const roleMatchGuard: CanMatchFn = (route: Route) => {
	return checkRole(route.data, inject(AuthService), inject(PLATFORM_ID));
};

