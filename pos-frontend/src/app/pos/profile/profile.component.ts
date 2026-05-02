import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { BillApi } from '../../core/bill.api';
import { UserProfile, SessionInfo, AuthAuditLog, OperatorSummary } from '../../core/auth.models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private billApi = inject(BillApi);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);

  profile$!: Observable<UserProfile | null>;
  session$!: Observable<SessionInfo | null>;
  history$!: Observable<AuthAuditLog[] | null>;
  summary$!: Observable<OperatorSummary | null>;

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  isChangingPassword = false;

  ngOnInit() {
    this.profile$ = this.authService.getProfile().pipe(catchError(() => of(null)));
    this.session$ = this.authService.getSession().pipe(catchError(() => of(null)));
    this.history$ = this.authService.getLoginHistory().pipe(catchError(() => of(null)));
    this.summary$ = this.billApi.getOperatorSummary().pipe(catchError(() => of(null)));
  }

  passwordMatchValidator(g: any) {
    return g.get('newPassword').value === g.get('confirmPassword').value
      ? null : { mismatch: true };
  }

  onChangePasswordSubmit() {
    if (this.passwordForm.invalid) return;
    this.isChangingPassword = true;
    this.authService.changePassword({
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    }).subscribe({
      next: () => {
        this.toast.success('Password changed successfully! Please login again.');
        this.isChangingPassword = false;
        this.passwordForm.reset();
      },
      error: (err: any) => {
        const errorMsg = err.error?.message || err.message || 'Failed to change password';
        this.toast.error(errorMsg);
        this.isChangingPassword = false;
      }
    });
  }

  logoutAll() {
    if (confirm('Are you sure you want to log out from ALL sessions?')) {
      this.authService.logoutAll().subscribe(() => {
        this.toast.success('Logged out of all sessions.');
      });
    }
  }

  logout() {
    this.authService.logout('/login');
    this.toast.success('Logged out successfully.');
  }
}
