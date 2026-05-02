import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, catchError, map, tap, throwError, timeout, take, of, timer } from 'rxjs';
import { Router } from '@angular/router';

import { AuthApi } from './auth.api';
import { ApiResponse, AuthIdentity, LoginRequest, LoginResponse, UserRole, UserStatus } from './auth.models';

const STORAGE_KEY = 'bull_pos_session';

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private readonly authApi = inject(AuthApi);
	private readonly router = inject(Router);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly isBrowser = isPlatformBrowser(this.platformId);

	private readonly identitySubject = new BehaviorSubject<AuthIdentity | null>(null);
	readonly identity$ = this.identitySubject.asObservable();

  private readonly isInitializedSubject = new BehaviorSubject<boolean>(false);
  readonly isAuthInitialized$ = this.isInitializedSubject.asObservable();

  constructor() {
    // Session rehydration is now handled by APP_INITIALIZER or manual call
    // But we still do a quick local check for zero-latency boot
    this.rehydrateFromStorage();
  }

  /**
   * Called by APP_INITIALIZER to ensure session is ready before app boots
   */
  public async initialize(): Promise<void> {
    if (!this.isBrowser) {
      this.isInitializedSubject.next(true);
      return;
    }

    // 1. Immediate local restore
    this.rehydrateFromStorage();

    // 2. Background verification
    const current = this.identity;
    if (current?.token) {
      try {
        const res = await this.authApi.getMe().pipe(timeout(5000), take(1)).toPromise();
        if (!res || !res.success) {
          console.warn('[Auth] Session verification failed on server');
          // We DON'T logout immediately if it's a generic error, only if 401
        }
      } catch (err: any) {
        if (err.status === 401) {
          console.error('[Auth] Token expired - clearing session');
          this.logout(null);
        }
      }
    }

    this.isInitializedSubject.next(true);
  }

  get isAuthInitialized(): boolean {
    return this.isInitializedSubject.value;
  }

  get identity(): AuthIdentity | null {
    return this.identitySubject.value;
  }

	get token(): string | null {
		return this.identitySubject.value?.token ?? null;
	}

	get role(): UserRole | null {
		return this.identitySubject.value?.role ?? null;
	}

  get status(): UserStatus {
    return this.identitySubject.value?.status ?? UserStatus.PendingApproval;
  }

  get storeId(): string | null {
    return this.identitySubject.value?.storeId ?? null;
  }

	get isAuthenticated(): boolean {
		const token = this.token;
		if (!token) return false;
		return !this.isTokenExpired(token);
	}

	public isTokenExpired(token: string | null): boolean {
		if (!token) return true;
		try {
			const parts = token.split('.');
			if (parts.length < 2) return true;
			const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
			const payloadJson = this.isBrowser ? atob(payloadBase64) : Buffer.from(payloadBase64, 'base64').toString();
			const payload = JSON.parse(payloadJson);
			if (!payload.exp) return false;
			return payload.exp * 1000 < Date.now();
		} catch (e) {
			return true;
		}
	}

	login(payload: LoginRequest): Observable<AuthIdentity> {
		return this.authApi.login(payload).pipe(
			timeout(10000),
			map(res => this.unwrapLoginResponse(res)),
			map(res => this.mapLoginResponse(res)),
			tap(identity => this.persistIdentity(identity)),
			tap(identity => void this.redirectAfterLogin(identity)),
			catchError(err => throwError(() => err))
		);
	}

	googleLogin(idToken: string): Observable<AuthIdentity> {
		return this.authApi.googleLogin(idToken).pipe(
			timeout(10000),
			map(res => this.unwrapLoginResponse(res)),
			map(res => this.mapLoginResponse(res)),
			tap(identity => this.persistIdentity(identity)),
			tap(identity => void this.redirectAfterLogin(identity)),
			catchError(err => throwError(() => err))
		);
	}

	getGoogleClientId(): Observable<string> {
		return this.authApi.getGoogleConfig().pipe(
			map(res => {
				if (!res.success || !res.data?.clientId) {
					throw new Error(res.message || 'Failed to load Google configuration');
				}
				return res.data.clientId;
			})
		);
	}

	logout(target: string | null = '/'): void {
    // Call backend to invalidate session on server
    this.authApi.logout().subscribe({
      next: () => {},
      error: (err) => console.error('[Auth] Backend logout failed:', err)
    });

		if (this.isBrowser) {
			localStorage.removeItem(STORAGE_KEY);
		}
		this.identitySubject.next(null);
    this.profileCache = null;
		if (target) {
			void this.router.navigate([target]);
		}
	}

  logoutAll(): Observable<void> {
    return this.authApi.logoutAll().pipe(
      tap(() => {
        if (this.isBrowser) {
          localStorage.removeItem(STORAGE_KEY);
        }
        this.identitySubject.next(null);
        this.profileCache = null;
        void this.router.navigate(['/login']);
      }),
      map(() => void 0)
    );
  }

  changePassword(payload: any): Observable<void> {
    return this.authApi.changePassword(payload).pipe(
      tap(() => this.logout('/login')),
      map(() => void 0)
    );
  }

  private profileCache: import('./auth.models').UserProfile | null = null;

  getProfile(forceRefresh = false): Observable<import('./auth.models').UserProfile> {
    if (this.profileCache && !forceRefresh) {
      return of(this.profileCache);
    }
    return this.authApi.getMe().pipe(
      map(res => {
        if (!res.success || !res.data) throw new Error(res.message);
        this.profileCache = res.data;
        return res.data;
      })
    );
  }

  getSession(): Observable<import('./auth.models').SessionInfo> {
    return this.authApi.getSession().pipe(
      map(res => {
        if (!res.success || !res.data) throw new Error(res.message);
        return res.data;
      })
    );
  }

  getLoginHistory(): Observable<import('./auth.models').AuthAuditLog[]> {
    return this.authApi.getLoginHistory().pipe(
      map(res => {
        if (!res.success || !res.data) throw new Error(res.message);
        return res.data;
      })
    );
  }

	private rehydrateFromStorage(): void {
    const stored = this.readStoredIdentity();
    if (stored) {
      this.identitySubject.next(stored);
    }
  }

	redirectAfterLogin(identity: AuthIdentity | null): void {
    console.log('[AuthService] redirectAfterLogin called', { 
      role: identity?.role, 
      status: identity?.status,
      storeId: identity?.storeId,
      hasToken: !!identity?.token 
    });

    if (!identity || !identity.token) {
      console.warn('[AuthService] No identity, redirecting to /login');
      void this.router.navigate(['/login']);
      return;
    }

    console.log('[AuthService] Executing redirect decision for:', { 
      role: identity.role, 
      status: identity.status, 
      storeId: identity.storeId 
    });

    // 1. STRICT Status Check: Block Rejected/Suspended first
    if (identity.status === UserStatus.Rejected) {
      console.error('[AuthService] Account Rejected');
      this.logout('/access-denied');
      return;
    }

    if (identity.status === UserStatus.Suspended) {
      console.error('[AuthService] Account Suspended');
      this.logout('/access-denied');
      return;
    }

    // 2. Pending Gate: Send to onboarding if explicitly Pending OR if role/status missing
    if (identity.status === UserStatus.PendingApproval || !identity.role) {
      console.warn('[AuthService] Account Pending Approval or missing role');
      void this.router.navigate(['/access-pending']);
      return;
    }

    // 3. Admin Access: Immediate entry to dashboard
    if (identity.role === 'Admin' || identity.role === 'Manager') {
      console.log('[AuthService] Admin verified -> /admin');
      void this.router.navigate(['/admin']);
      return;
    }

    // 4. Cashier Access: Store assignment required
    if (identity.role === 'Cashier') {
      if (identity.storeId && identity.storeId !== '00000000-0000-0000-0000-000000000000') {
        console.log('[AuthService] Cashier verified with store -> /pos');
        void this.router.navigate(['/pos']);
      } else {
        console.warn('[AuthService] Cashier missing store assignment -> /access-pending');
        void this.router.navigate(['/access-pending']);
      }
      return;
    }

    // 5. Fallback: Security safety gate
    console.warn('[AuthService] Unknown configuration -> /access-pending');
		void this.router.navigate(['/access-pending']);
	}

  redirectTo404(): void {
    void this.router.navigate(['/404']);
  }

	private mapLoginResponse(res: LoginResponse): AuthIdentity {
    const decoded = this.decodeJwt(res.token);
		const role = decoded?.role ?? res.role ?? null;
    const status = decoded?.status ?? res.status ?? UserStatus.PendingApproval;
    const storeId = decoded?.storeId ?? res.storeId ?? null;
    const email = decoded?.email ?? res.email;
    const userId = decoded?.userId ?? res.userId;
    const sessionId = decoded?.sessionId ?? res.sessionId;
    const terminalId = decoded?.terminalId ?? res.terminalId;

    // Architecture Fix: 
    // 1. If Cashier, default to POS mode (they always go to terminal)
    // 2. If Admin/Manager, default to ADMIN mode (they go to dashboard first)
    // 3. We ONLY set POS mode if a sessionId is actually present OR if it's a Cashier.
    let mode: 'ADMIN' | 'POS' = 'ADMIN';
    if (role === 'Cashier' || sessionId) {
      mode = 'POS';
    }

		return { token: res.token, role, status, storeId, email, userId, sessionId, terminalId, mode };
	}

	private unwrapLoginResponse(res: ApiResponse<LoginResponse>): LoginResponse {
		if (!res?.success) {
			throw new Error(res?.message || 'Login failed');
		}
		if (!res.data?.token) {
			throw new Error('Invalid login response: missing token');
		}
		return res.data;
	}

	public persistIdentity(identity: AuthIdentity): void {
		if (this.isBrowser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
		}
		this.identitySubject.next(identity);
	}

	private readStoredIdentity(): AuthIdentity | null {
		if (!this.isBrowser) return null;

		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as AuthIdentity;
			if (!parsed?.token) return null;

			const decoded = this.decodeJwt(parsed.token);
			return { 
        token: parsed.token, 
        role: parsed.role ?? decoded?.role ?? null, 
        status: parsed.status ?? decoded?.status ?? UserStatus.PendingApproval, 
        storeId: parsed.storeId ?? decoded?.storeId ?? null,
        email: parsed.email ?? decoded?.email,
        userId: parsed.userId ?? decoded?.userId,
        sessionId: parsed.sessionId ?? decoded?.sessionId,
        terminalId: parsed.terminalId ?? decoded?.terminalId
      };
		} catch {
			return null;
		}
	}

  private decodeJwt(token: string): { role: UserRole | null, status: UserStatus, storeId: string | null, email?: string, userId?: string, sessionId?: string, terminalId?: string } | null {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const payload = parts[1];
      const paddedPayload = payload.length % 4 === 0 ? payload : payload + '='.repeat(4 - (payload.length % 4));
      const base64 = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
      
      const json = this.isBrowser ? atob(base64) : Buffer.from(base64, 'base64').toString();
      const obj = JSON.parse(json) as Record<string, unknown>;

      const role =
        (obj['role'] as string | undefined) ??
        (obj['Role'] as string | undefined) ??
        (obj['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined);

      const statusRaw = (obj['status'] as string | number | undefined) ?? (obj['Status'] as string | number | undefined);
      let status = UserStatus.PendingApproval;
      if (statusRaw !== undefined) {
        if (typeof statusRaw === 'number') {
          status = statusRaw as UserStatus;
        } else {
          // Map string to enum (Case-insensitive)
          const s = String(statusRaw).trim().toUpperCase();
          if (s === 'ACTIVE') status = UserStatus.Active;
          else if (s === 'PENDINGAPPROVAL' || s === 'PENDING') status = UserStatus.PendingApproval;
          else if (s === 'REJECTED') status = UserStatus.Rejected;
          else if (s === 'SUSPENDED') status = UserStatus.Suspended;
          else if (s === 'LOCKED') status = UserStatus.Locked;
          else if (s === 'REGISTERED') status = UserStatus.Registered;
          else if (s === 'INVITED') status = UserStatus.Invited;
        }
      }

      const storeId = (obj['storeId'] as string | undefined) ?? (obj['StoreId'] as string | undefined) ?? (obj['store_id'] as string | undefined);
      
      const email = (obj['email'] as string | undefined) ?? (obj['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string | undefined);
      const userId = (obj['sub'] as string | undefined) ?? (obj['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string | undefined);
      const sessionId = obj['sessionId'] as string | undefined;
      const terminalId = obj['terminalId'] as string | undefined;

      return { role: role ?? null, status, storeId: storeId ?? null, email, userId, sessionId, terminalId };
    } catch (e) {
      console.warn('[Auth] Error decoding JWT:', e);
      return null;
    }
  }
}
