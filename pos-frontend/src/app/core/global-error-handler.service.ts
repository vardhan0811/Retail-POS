import { ErrorHandler, Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  constructor(
    private zone: NgZone, 
    private router: Router, 
    private toast: ToastService,
    private auth: AuthService
  ) {}

  private recentErrors = new Set<string>();

  handleError(error: any): void {
    let errorMessage = 'An unexpected error occurred.';
    
    if (error instanceof HttpErrorResponse) {
      // Backend returned an unsuccessful response code.
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || JSON.stringify(error.error?.errors) || 'Validation Error. Please check your input.';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in again.';
          if (this.isBrowser) {
            this.zone.run(() => this.auth.logout());
          }
          break;
        case 403:
          errorMessage = 'Access Denied. You do not have permission to perform this action.';
          break;
        case 409:
          errorMessage = error.error?.message || 'Concurrency Conflict: The record was modified by another user. Please refresh and try again.';
          break;
        case 500:
          errorMessage = 'Internal Server Error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || `Server Error (${error.status}): ${error.statusText}`;
          break;
      }
    } else if (error instanceof Error) {
      // Client-side or network error
      errorMessage = error.message;
    }

    if (this.isBrowser || (error instanceof HttpErrorResponse && error.status !== 401)) {
      console.error('[GlobalErrorHandler]', error);
    }
    
    // Show Toast with throttling
    if (this.isBrowser) {
      if (!this.recentErrors.has(errorMessage)) {
        this.recentErrors.add(errorMessage);
        this.zone.run(() => {
            this.toast.error(errorMessage);
        });
        setTimeout(() => {
          this.recentErrors.delete(errorMessage);
        }, 3000); // Clear after 3 seconds
      }
    }
  }
}
