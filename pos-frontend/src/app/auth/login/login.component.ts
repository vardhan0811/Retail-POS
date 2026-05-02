import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout, Subject, takeUntil, filter, take } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { FormsModule } from '@angular/forms';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styles: [`
    .floating-label-group {
      position: relative;
    }
    .floating-label-group label {
      position: absolute;
      top: 50%;
      left: 1.25rem;
      transform: translateY(-50%);
      transition: all 0.2s ease-in-out;
      pointer-events: none;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .floating-label-group input:focus ~ label,
    .floating-label-group input:not(:placeholder-shown) ~ label {
      top: 0;
      left: 0.75rem;
      font-size: 0.65rem;
      background: white;
      padding: 0 0.5rem;
      color: var(--color-primary);
      transform: translateY(-50%);
    }
    .input-icon-container {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .icon-btn {
      color: var(--text-muted);
      cursor: pointer;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-btn:hover {
      color: var(--color-primary);
    }
    .error-message {
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;
      font-weight: 500;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .google-btn-container {
      margin: 24px auto 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50px;
    }
    .google-btn-wrapper {
      width: 100%;
      max-width: 360px; /* Matching the submit button visual weight */
      display: flex;
      justify-content: center;
      transition: all 0.3s ease;
    }
    .google-fallback-text {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 12px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
    }
  `],
  template: `
    <div class="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <!-- Decor -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>

      <div class="w-full max-w-[440px] relative z-10 flex flex-col items-center gap-6">
        <!-- Brand Header -->
        <div class="text-center">
          <h1 class="text-4xl font-black text-primary tracking-tighter uppercase leading-none flex items-center justify-center gap-3">
            <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-12 h-12 object-contain" alt="Logo">
            <span>Retail<span class="text-accent">POS</span></span>
          </h1>
          <p class="text-[13px] font-bold text-muted/60 uppercase tracking-[0.15em] mt-3">Sign in to your operator console</p>
        </div>

        <div class="pos-card w-full p-10 bg-white shadow-2xl transition-shadow duration-300 hover:shadow-primary/5">
          <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-8" novalidate>
            <!-- Email Field -->
            <div class="space-y-1">
              <div class="floating-label-group">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder=" "
                  autofocus
                  class="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 focus:border-primary/20 focus:bg-white rounded-2xl shadow-sm transition-all text-sm font-bold outline-none leading-none"
                />
                <label for="email">Account Email</label>
                
                <div class="input-icon-container" *ngIf="form.controls.email.value">
                  <button type="button" (click)="clearField('email')" class="icon-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <p *ngIf="form.controls.email.touched && form.controls.email.invalid" class="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1 pt-1">
                Email is required
              </p>
            </div>

            <!-- Password Field -->
            <div class="space-y-1">
              <div class="floating-label-group">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder=" "
                  class="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 focus:border-primary/20 focus:bg-white rounded-2xl shadow-sm transition-all text-sm font-bold outline-none leading-none"
                />
                <label for="password">Security Password</label>
                
                <div class="input-icon-container">
                  <button type="button" (click)="togglePassword()" class="icon-btn">
                    <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  </button>
                </div>
              </div>
              <p *ngIf="form.controls.password.touched && form.controls.password.invalid" class="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1 pt-1">
                Password is required
              </p>
            </div>

            <div *ngIf="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              [disabled]="isLoading || form.invalid"
              class="w-full bg-[#0B0F19] text-white py-5 rounded-full font-bold text-base flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform transition-all active:scale-[0.98] mt-4 group/cta"
            >
              <div *ngIf="!isLoading" class="w-6 h-6 bg-white rounded-full flex items-center justify-center group-hover/cta:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-[#0B0F19]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
              <div *ngIf="isLoading" class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Start Work Session</span>
            </button>

            <!-- Google Sign-In Integration -->
            <div class="google-btn-container">
              <div id="google-login-btn" class="google-btn-wrapper" [class.opacity-0]="!isGoogleConfigLoaded"></div>
              
              <div *ngIf="!isGoogleConfigLoaded && !googleLoadFailed" class="google-fallback-text">
                Initializing Secure Auth...
              </div>

              <div *ngIf="googleLoadFailed" class="text-xs text-red-500 font-bold mt-2 uppercase tracking-tighter">
                Auth Service Unavailable
              </div>
            </div>
          </form>

          <div class="mt-8 text-center">
            <p class="text-[10px] font-bold text-muted/60 uppercase tracking-[0.2em] leading-relaxed" id="auth-legal-notice">
              Secured Connection • v4.2.0-STABLE<br>
              Authorized Device Only
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  username: string = '';

  isLoading = false;
  isGoogleConfigLoaded = false;
  googleLoadFailed = false; // Graceful fallback flag
  clientId: string | null = null;
  errorMessage = '';
  showPassword = false;

  ngOnInit(): void {
    // Phase 1: Redirect already logged-in users after state is ready
    this.authService.isAuthInitialized$.pipe(
      filter(init => init),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.authService.isAuthenticated) {
        console.log('[LoginComponent] Already authenticated, redirecting...');
        this.authService.redirectAfterLogin(this.authService.identity);
      }
    });

    // Auto-hide error when user starts typing
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage) {
          this.errorMessage = '';
          this.cdr.detectChanges();
        }
      });

    // Fetch Google Client ID from backend
    this.authService.getGoogleClientId()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientId: string) => {
          console.log('Client ID:', clientId);
          this.clientId = clientId;
          this.isGoogleConfigLoaded = true;
          this.initializeGoogleAuth(clientId);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[LoginComponent] Failed to load Google configuration:', err);
          // Button remains disabled, user can still use local login
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isGoogleInitialized = false;
  private googleInitAttempts = 0;
  private initializeGoogleAuth(clientId: string): void {
    if (this.isGoogleInitialized) return;

    // Graceful fallback check with retry logic for async script loading
    if (typeof google === 'undefined' || !google.accounts) {
      if (this.googleInitAttempts < 30) {
        this.googleInitAttempts++;
        setTimeout(() => this.initializeGoogleAuth(clientId), 200);
        return;
      }
      console.warn('[LoginComponent] Google Identity Services script not detected after multiple attempts.');
      this.googleLoadFailed = true;
      this.cdr.detectChanges();
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleGoogleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render the official button into our styled wrapper
      google.accounts.id.renderButton(
        document.getElementById('google-login-btn'),
        {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 360,
          logo_alignment: 'left'
        }
      );

      this.isGoogleInitialized = true;
      console.log('[LoginComponent] Google Identity Services initialized successfully.');
    } catch (error) {
      console.error('[LoginComponent] Failed to initialize Google Auth:', error);
      this.googleLoadFailed = true;
      this.cdr.detectChanges();
    }
  }

  handleGoogleCredentialResponse(response: any): void {
    console.log('[LoginComponent] Google Credential received');
    if (!response.credential) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.googleLogin(response.credential)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          console.log('[LoginComponent] Google login success');
        },
        error: (err) => {
          console.warn('[LoginComponent] Google login failure:', err);
          this.errorMessage = err.message || 'Google authentication failed.';
          this.cdr.detectChanges();
        }
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const { email, password } = this.form.getRawValue();
    this.authService.login({ email, password })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Invalid credentials. Please try again.';
          console.warn('[LoginComponent] Login failure:', err);
          this.cdr.detectChanges();
        }
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  clearField(controlName: string): void {
    this.form.get(controlName)?.setValue('');
    this.errorMessage = '';
    this.cdr.detectChanges();
  }
}
