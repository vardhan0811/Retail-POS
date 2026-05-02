import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, UserStatusFilter } from './users.service';
import { RouterLink } from '@angular/router';
import { AuthApi, RegisterRequest } from '../../core/auth.api';
import { UserStatus } from '../../core/auth.models';
import { UserApi } from '../../core/user.api';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <style>
      .users-grid {
        display: grid;
        grid-template-columns: 2.5fr 2.5fr 1.5fr 2fr 1.5fr 2fr;
        align-items: center;
        padding: 0 24px;
        min-height: 72px;
      }
      .users-header {
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        font-size: 10px;
        font-weight: 900;
        color: #64748b;
        height: 48px;
      }
      .user-row {
        border-bottom: 1px solid #f8fafc;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .user-row:hover {
        background: rgba(0, 0, 0, 0.015);
      }
      .user-badge {
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        border-radius: 99px;
        font-size: 10px;
        font-weight: 800;
        min-width: 90px;
        border: 1px solid transparent;
      }
      .avatar-circle {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        color: #1e293b;
        flex-shrink: 0;
      }
      .action-btn {
        height: 36px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
        transition: all 0.2s;
      }
    </style>

    <div class="max-w-[1600px] mx-auto p-8 lg:p-14 space-y-10">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 class="text-4xl font-black text-primary tracking-tighter">Security Intelligence</h2>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] mt-3 opacity-60">System Personnel & Access Protocol</p>
        </div>
        <button 
          class="pos-btn"
          [class.pos-btn-secondary]="creating"
          [class.pos-btn-primary]="!creating"
          (click)="creating = !creating"
        >
          <span class="flex items-center gap-2">
            <svg *ngIf="!creating" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
            <svg *ngIf="creating" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            {{ creating ? 'Close Registry' : 'New Personnel' }}
          </span>
        </button>
      </div>

      <!-- Create User Form -->
      <div *ngIf="creating" class="pos-card p-10 mb-10 border border-slate-50 max-w-4xl animate-in slide-in-from-top-4 duration-500">
        <h3 class="text-xl font-black text-primary tracking-tight mb-8 text-accent">Enroll New Identity</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Full Name</label>
            <input type="text" [(ngModel)]="createName" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="e.g. John Doe" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Email Address</label>
            <input type="email" [(ngModel)]="createEmail" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="user@nexus.com" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Secure Password</label>
            <input type="password" [(ngModel)]="createPassword" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">System Role</label>
            <select [(ngModel)]="createRole" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer appearance-none">
              <option value="Admin">Administrator</option>
              <option value="Cashier">Cashier Restricted</option>
            </select>
          </div>
          <div class="md:col-span-2 space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Assigned Store ID (Optional)</label>
            <input type="text" [(ngModel)]="createStoreId" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="Store UUID" />
          </div>
        </div>
        
        <div class="mt-10 flex items-center justify-end gap-4">
          <button class="pos-btn pos-btn-primary px-12 py-4" [disabled]="createLoading || !canCreate()" (click)="createUser()">
            <span *ngIf="!createLoading">Deploy Account</span>
            <div *ngIf="createLoading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </button>
        </div>

        <div *ngIf="createError" class="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold leading-relaxed">
          {{ createError }}
        </div>
      </div>

      <!-- Filters & Stats Bar -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <select [(ngModel)]="role" (change)="applyFilters()" class="bg-white border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold text-primary focus:ring-4 focus:ring-accent/5 transition-all shadow-sm cursor-pointer appearance-none">
          <option value="">Roles: All</option>
          <option value="Admin">Admins</option>
          <option value="Cashier">Cashiers</option>
        </select>

        <select [(ngModel)]="status" (change)="applyFilters()" class="bg-white border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold text-primary focus:ring-4 focus:ring-accent/5 transition-all shadow-sm cursor-pointer appearance-none">
          <option value="all">Status: All</option>
          <option value="pending">Pending Approval</option>
          <option value="active">Active Operational</option>
          <option value="suspended">Suspended Access</option>
          <option value="locked">Locked Account</option>
          <option value="rejected">Rejected Request</option>
        </select>

        <div class="lg:col-span-1 relative group">
           <input type="text" [(ngModel)]="storeId" (keyup.enter)="applyFilters()" class="w-full bg-white border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold text-primary focus:ring-4 focus:ring-accent/5 transition-all shadow-sm" placeholder="Filter by Store ID..." />
        </div>

        <div class="flex gap-2">
          <button class="flex-1 pos-btn pos-btn-primary py-4 text-xs tracking-widest uppercase" (click)="applyFilters()">Execute Search</button>
          <button class="w-14 h-14 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-muted rounded-2xl transition-colors" (click)="resetFilters()">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="pos-card overflow-hidden border border-slate-100" *ngIf="!error()">
        <!-- Grid Header -->
        <div class="users-grid users-header">
          <div>Profile</div>
          <div>Credentials</div>
          <div>System Role</div>
          <div>Assigned Location</div>
          <div>Lifecycle</div>
          <div class="text-right">Actions</div>
        </div>

        <!-- Grid Body -->
        <div class="bg-white min-h-[400px]">
          <div *ngIf="loading() && !users().length" class="py-20 flex flex-col items-center justify-center gap-4 animate-pulse">
            <div class="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
            <span class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Synchronizing Identity Database</span>
          </div>

          <div *ngFor="let user of users()" class="users-grid user-row">
            <!-- Profile -->
            <div class="flex items-center gap-4">
              <div class="avatar-circle">
                {{ user.userName.substring(0, 2) }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-black text-primary truncate tracking-tight">{{ user.userName }}</span>
                <span class="text-[10px] font-bold text-muted uppercase tracking-wider opacity-60">ID: {{ user.id.substring(0, 8) }}</span>
              </div>
            </div>

            <!-- Credentials -->
            <div class="flex flex-col">
              <span class="text-xs font-bold text-primary truncate">{{ user.email }}</span>
              <span class="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Identity Verified</span>
            </div>

            <!-- Role -->
            <div>
              <span *ngIf="user.role" class="user-badge bg-slate-50 text-slate-500 border-slate-100">
                {{ user.role }}
              </span>
              <span *ngIf="!user.role" class="text-[10px] font-bold text-muted uppercase italic opacity-30">Unassigned</span>
            </div>

            <!-- Location -->
            <div class="flex flex-col gap-0.5">
              <span *ngIf="user.storeName" class="text-xs font-bold text-primary truncate">{{ user.storeName }}</span>
              <span *ngIf="!user.storeName" class="text-[10px] font-bold text-muted uppercase italic opacity-30">No Store Group</span>
              <span *ngIf="user.assignedStoreNames.length > 1" class="text-[9px] font-black text-accent uppercase tracking-tighter" [title]="user.assignedStoreNames.join(', ')">+{{ user.assignedStoreNames.length - 1 }} More</span>
            </div>

            <!-- Lifecycle -->
            <div>
              <span class="user-badge" [ngClass]="getStatusClass(user.status)">
                {{ getStatusLabel(user.status) }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2">
              <ng-container *ngIf="user.status === UserStatus.PendingApproval">
                <button (click)="approveUser(user)" class="action-btn bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100">
                  Approve
                </button>
                <button (click)="rejectUser(user)" class="action-btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">
                  Reject
                </button>
              </ng-container>
              
              <a [routerLink]="['/admin/users', user.id]" class="action-btn bg-white border border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-primary">
                Profile
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
              </a>
            </div>
          </div>

          <div *ngIf="users().length === 0 && !loading()" class="py-32 flex flex-col items-center justify-center gap-4 opacity-30 grayscale">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span class="text-[10px] font-black uppercase tracking-[0.3em]">Zero Identity Records Found</span>
          </div>
        </div>

        <!-- Pagination Footer -->
        <div class="px-8 py-6 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
          <div class="flex items-center gap-6">
             <div class="flex items-center gap-3">
               <span class="text-[9px] font-black text-muted uppercase tracking-widest">Page Index</span>
               <div class="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[11px] font-black text-primary">{{ page() }} / {{ totalPages() }}</div>
             </div>
             
             <select [ngModel]="pageSize()" (ngModelChange)="setPageSize($event)" class="bg-white border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-black text-primary cursor-pointer outline-none shadow-sm">
              <option [value]="8">8 Records / View</option>
              <option [value]="16">16 Records / View</option>
              <option [value]="32">32 Records / View</option>
            </select>
          </div>
          
          <div class="flex gap-3">
            <button class="pos-btn bg-white border border-slate-100 hover:bg-slate-50 text-[10px] font-black tracking-widest uppercase px-6 h-11 disabled:opacity-30 disabled:grayscale transition-all active:scale-95" [disabled]="page() <= 1" (click)="setPage(page() - 1)">Back</button>
            <button class="pos-btn bg-white border border-slate-100 hover:bg-slate-50 text-[10px] font-black tracking-widest uppercase px-6 h-11 disabled:opacity-30 disabled:grayscale transition-all active:scale-95" [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)">Forward</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  protected readonly UserStatus = UserStatus;
  private readonly svc = inject(AdminUsersService);
  private readonly authApi = inject(AuthApi);
  private readonly userApi = inject(UserApi);

  loading = this.svc.loading;
  error = this.svc.error;
  users = this.svc.users;
  page = this.svc.page;
  pageSize = this.svc.pageSize;
  totalPages = this.svc.totalPages;
  totalCount = this.svc.totalCount;

  role = '';
  status: UserStatusFilter = 'all';
  storeId = '';

  creating = false;
  createLoading = false;
  createError: string | null = null;
  createName = '';
  createEmail = '';
  createPassword = '';
  createRole = 'Cashier';
  createStoreId = '';

  ngOnInit(): void {
    this.role = this.svc.role();
    this.status = this.svc.status();
    this.storeId = this.svc.storeId();

    this.svc.refresh();
  }

  getStatusClass(status: UserStatus): string {
    switch (status) {
      case UserStatus.PendingApproval: return 'bg-amber-50 text-amber-600 border-amber-100';
      case UserStatus.Registered: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case UserStatus.Active: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case UserStatus.Suspended:
      case UserStatus.Locked:
      case UserStatus.Rejected: return 'bg-red-50 text-red-600 border-red-100';
      case UserStatus.Invited: return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getStatusLabel(status: UserStatus): string {
    switch (status) {
      case UserStatus.PendingApproval: return 'Pending Approval';
      case UserStatus.Registered: return 'Registered';
      case UserStatus.Invited: return 'Invited';
      case UserStatus.Active: return 'Active';
      case UserStatus.Suspended: return 'Suspended';
      case UserStatus.Locked: return 'Locked';
      case UserStatus.Rejected: return 'Rejected';
      default: return 'Unknown';
    }
  }

  canCreate(): boolean {
    return this.createName.trim().length > 0 && 
           this.createEmail.trim().length > 0 &&
           this.createPassword.trim().length > 0;
  }

  createUser(): void {
    this.createLoading = true;
    this.createError = null;

    const payload: RegisterRequest = {
      userName: this.createName.trim(),
      email: this.createEmail.trim(),
      password: this.createPassword,
      role: this.createRole,
      storeId: this.createStoreId.trim() || null
    };

    this.authApi.register(payload)
      .pipe(finalize(() => this.createLoading = false))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.createError = res.message || 'Failed to create user.';
            return;
          }
          this.createName = '';
          this.createEmail = '';
          this.createPassword = '';
          this.createRole = 'Cashier';
          this.createStoreId = '';
          this.creating = false;
          this.svc.refresh();
        },
        error: () => this.createError = 'Network failure during creation.'
      });
  }

  approveUser(user: any): void {
    if (!confirm(`Are you sure you want to approve ${user.userName}?`)) return;
    
    this.userApi.activateUser(user.id).subscribe({
      next: (res) => {
        if (res.success) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: `User ${user.userName} has been approved.` }));
          
          // Optimistic update for immediate feedback
          this.svc.updateUserLocally(user.id, { 
            status: UserStatus.Registered
          });

          // Re-fetch to ensure sync with backend events
          setTimeout(() => this.svc.refresh(), 1000);
        } else {
          console.error('[Admin] Approval failed:', res.message);
          alert(`Approval failed: ${res.message}`);
        }
      },
      error: (err) => {
        console.error('[Admin] Approval network error:', err);
        alert('Network failure. Could not connect to identity authority.');
      }
    });
  }

  rejectUser(user: any): void {
    const reason = prompt(`Specify reason for rejecting ${user.userName}:`);
    if (reason === null) return;
    
    this.userApi.rejectUser(user.id, reason || 'No reason provided').subscribe({
      next: (res) => {
        if (res.success) {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: `User ${user.userName} has been rejected.` }));
          this.svc.refresh();
        } else {
          console.error('[Admin] Rejection failed:', res.message);
          alert(`Rejection failed: ${res.message}`);
        }
      },
      error: (err) => {
        console.error('[Admin] Rejection network error:', err);
        alert('Network failure. Could not connect to identity authority.');
      }
    });
  }

  applyFilters(): void {
    this.svc.role.set(this.role);
    this.svc.status.set(this.status);
    this.svc.storeId.set(this.storeId);
    this.svc.applyFilters();
  }

  setPage(next: number): void {
    this.svc.setPage(next);
  }

  setPageSize(size: number | any): void {
    this.svc.setPageSize(Number(size));
  }

  resetFilters(): void {
    this.role = '';
    this.status = 'all';
    this.storeId = '';
    this.applyFilters();
  }
}
