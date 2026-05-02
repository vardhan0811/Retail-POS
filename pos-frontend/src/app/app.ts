import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ToastComponent } from './core/toast/toast.component';
import { ModalContainerComponent } from './shared/components/modal-container/modal-container.component';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    ToastComponent,
    ModalContainerComponent,
    CommonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isInitialized$ = this.auth.isAuthInitialized$;

  ngOnInit() {
    this.handleUrlSession();
    
    // Removed auto-redirect from root to allow landing page access
    // Redirection is now handled by Guards or specific component logic
  }

  constructor() {}

  /**
   * If token and sessionId are present in URL (Admin -> POS flow),
   * manually initialize the session.
   */
  private handleUrlSession(): void {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const sessionId = urlParams.get('sessionId');

    if (token && sessionId) {
      console.log('[App] Initializing session from URL context...');
      
      // We manually build the identity and persist it.
      // The auth service will decode the JWT to get role/storeId/etc.
      // Using direct cast for quick mapping
      const identity: any = { token, sessionId };
      
      // Trigger manual re-authentication with this token
      localStorage.setItem('bull_pos_session', JSON.stringify(identity));
      
      // Clear URL params to keep it clean
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('sessionId');
      window.history.replaceState({}, '', url.toString());

      // Instead of reload, re-initialize auth state explicitly
      void this.auth.initialize().then(() => {
        this.auth.redirectAfterLogin(this.auth.identity);
      });
    }
  }
}
