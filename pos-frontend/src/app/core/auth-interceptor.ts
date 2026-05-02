import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError, tap, EMPTY } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // Lazy inject AuthService to break NG0200 circular dependency
  const auth = injector.get(AuthService);
  const token = auth?.token;
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  // DEBUG: log every outbound HTTP request so we can verify:
  // 1. The correct base URL (http://localhost:5000) is used
  // 2. The Authorization header is attached
  if (isBrowser || token) {
    console.log(
      `[API] REQUEST START: ${authReq.method} ${authReq.url}`,
      token ? `(Bearer ${token.slice(0, 12)}…)` : '(NO TOKEN ⚠)'
    );
  }

  return next(authReq).pipe(
    tap(event => {
      // Log successful responses
      if ((event as any)?.status >= 200 && (event as any)?.status < 300) {
        if (isBrowser || token) {
           console.log(`[API] REQUEST SUCCESS: ${authReq.method} ${authReq.url}`);
        }
      }
    }),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          if (isBrowser) {
             console.warn(`[API] 401 Unauthorized (Session Expired): ${authReq.url}`);
          }
          
          const isLoginRequest = authReq.url.includes('/api/Auth/login');
          
          if (!isLoginRequest) {
            if (isBrowser) {
              console.warn('[API] 401 Unauthorized → logging out');
              auth.logout('/login');
            } else {
              // CRITICAL SSR FIX: Silence 401s during SSR to prevent uncaughtException crashing the Node process.
              // We return EMPTY which finishes the observable without emitting an error.
              return EMPTY;
            }
          }
        } else {
            console.error(`[API] REQUEST FAILURE: ${authReq.method} ${authReq.url} → ${err.status}`, err.error);
            
            // Handle Backend Down (Status 0)
            if (isBrowser && err.status === 0) {
              window.dispatchEvent(new CustomEvent('show-toast', { 
                detail: 'Critical Error: Backend Server is unreachable. Please verify connectivity.' 
              }));
            }

            // GLOBAL ERROR HANDLING: Show toast for 500 errors
            if (isBrowser && err.status >= 500) {
              window.dispatchEvent(new CustomEvent('show-toast', { 
                detail: `System Error (${err.status}): ${err.error?.message || 'Action failed on server'}` 
              }));
            }
        }
      }
      // Re-throw for all other cases (or if it wasn't a 401 we silenced)
      return throwError(() => err);
    })
  );
};
