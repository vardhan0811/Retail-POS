import { Component, OnInit, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UpdateUserRoleRequest, UpdateUserStatusRequest, UserApi, UserDto, UpdateUserStoreRequest, UpdateUserStoresRequest, ApiResponse } from '../../core/user.api';
import { StoreApi, StoreDto } from '../../core/store.api';
import { UserStatus } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';

import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-admin-user-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatSelectModule, MatFormFieldModule],
  template: `
    <div class="max-w-[1200px] mx-auto p-8 lg:p-14 space-y-10 animate-in fade-in duration-700">
      <div class="flex items-center gap-6 mb-8">
        <a routerLink="/admin/users" class="pos-btn bg-white border border-slate-100 hover:bg-slate-50 transition-all text-xs font-black uppercase tracking-widest p-4 rounded-2xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        </a>
        <div>
          <h2 class="text-4xl font-black text-primary tracking-tighter">Security Profile</h2>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] mt-2 opacity-60">Identity & Protocol Configuration</p>
        </div>
      </div>

      <div *ngIf="loadingInit()" class="py-20 flex justify-center italic text-muted text-sm font-bold tracking-widest animate-pulse">
        Polling Identity Hub...
      </div>
      
      <div *ngIf="error()" class="bg-red-50 text-red-600 p-8 rounded-[2rem] border border-red-100 flex items-center gap-6">
        <div class="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 class="font-black text-red-900 leading-none">Access Violation</h4>
          <p class="text-xs font-bold mt-1 opacity-70">{{ error() }}</p>
        </div>
      </div>

      <div *ngIf="user() as u" class="grid grid-cols-1 md:grid-cols-2 gap-10">
        <!-- Identity Summary Card -->
        <div class="pos-card p-10 border border-slate-50 md:col-span-2 flex flex-col md:flex-row gap-10 items-center bg-white shadow-xl shadow-slate-200/20">
          <div class="w-32 h-32 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-primary text-4xl font-black uppercase shadow-inner">
            {{ u.userName.substring(0, 2) }}
          </div>
          <div class="flex-1 text-center md:text-left">
            <h3 class="text-4xl font-black text-primary tracking-tighter">{{ u.userName }}</h3>
            <p class="text-sm font-mono font-bold text-muted uppercase tracking-widest mt-2">{{ u.email }}</p>
            <div class="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
              <span *ngIf="u.role" class="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200/50">{{ u.role }}</span>
              <span *ngIf="!u.role" class="px-5 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200/50 italic">Pending Assignment</span>
              <span class="pos-badge" [ngClass]="getStatusClass(u.status)">
                {{ getStatusLabel(u.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Role Assignment -->
        <div class="pos-card p-10 border border-slate-50 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-black text-primary tracking-tight uppercase">System Permissions</h3>
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
            </div>
            <p class="text-xs font-bold text-muted leading-relaxed uppercase tracking-tighter mb-8 italic">Define the administrative scope for this identity.</p>
            
            <div class="space-y-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Authority Role</label>
                <div class="relative">
                  <select [(ngModel)]="editRole" [disabled]="savingRole() || isSelf()" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all cursor-pointer appearance-none pr-12 disabled:opacity-40 disabled:cursor-not-allowed">
                    <option [value]="null" disabled>Select Role...</option>
                    <option value="Admin">Admin</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                  <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-10">
             <button class="pos-btn pos-btn-primary w-full py-4 tracking-widest uppercase text-xs" [disabled]="savingRole() || editRole === u.role || isSelf()" (click)="saveRole()">
                {{ isSelf() ? 'Self-Modification Prohibited' : savingRole() ? 'Updating Role...' : 'Save Role Assignment' }}
              </button>
          </div>
        </div>

        <!-- Multi-Store Assignment -->
        <div class="pos-card p-10 border border-slate-50 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-4">
               <h3 class="text-xl font-black text-primary tracking-tight uppercase">Base Operations</h3>
               <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
               </div>
            </div>
            <p class="text-xs font-bold text-muted leading-relaxed uppercase tracking-tighter mb-8 italic">Assign this user to one or more physical store locations.</p>
            
            <div class="space-y-6">
               <div class="space-y-3">
                 <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Assigned Units</label>
                 
                 <mat-form-field appearance="outline" class="w-full pos-form-field">
                    <mat-select [(ngModel)]="selectedStoreIds" multiple placeholder="Select Facility Access" class="text-sm font-bold">
                      <mat-option *ngFor="let s of availableStores" [value]="s.id">
                        {{ s.name }}
                      </mat-option>
                    </mat-select>
                    <mat-hint class="text-[9px] font-bold text-muted uppercase tracking-tighter italic">Select one or more facilities</mat-hint>
                 </mat-form-field>

                 <div *ngIf="availableStores.length === 0" class="text-xs italic text-muted opacity-40 py-2">Polling infrastructure data...</div>
               </div>
            </div>
          </div>
          
          <div class="mt-10">
              <button class="pos-btn pos-btn-primary w-full py-4 tracking-widest uppercase text-xs" [disabled]="savingStore() || !hasStoreChanges()" (click)="saveStore()">
                {{ savingStore() ? 'Syncing Base...' : 'Update Facility Access' }}
              </button>
          </div>
        </div>

        <!-- Lifecycle Control (Suspend) -->
        <div class="pos-card p-10 border border-slate-50 md:col-span-2 bg-slate-50/30">
           <div class="flex flex-col md:flex-row items-center justify-between gap-10">
              <div class="max-w-xl">
                 <h3 class="text-xl font-black text-primary tracking-tight uppercase mb-4">Access Protocol</h3>
                 <p class="text-[10px] font-bold text-muted leading-relaxed uppercase tracking-tighter mb-4 italic">
                   Emergency lock overrides all active sessions and prevents further authentication attempts.
                 </p>
                 <div class="flex items-center gap-3">
                   <div class="w-2 h-2 rounded-full" [ngClass]="u.status === UserStatus.Active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'"></div>
                   <span class="text-xs font-black uppercase tracking-widest" [ngClass]="u.status === UserStatus.Active ? 'text-emerald-600' : 'text-red-600'">
                     {{ u.status === UserStatus.Active ? 'Network Access: Authorized' : 'Network Access: Revoked' }}
                   </span>
                 </div>
              </div>

              <div class="flex items-center gap-4">
                 <div class="flex items-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Disable Login Access</span>
                      <span class="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{{ isSelf() ? 'PROTECTED IDENTITY' : 'SECURITY OVERRIDE' }}</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [checked]="u.status === UserStatus.Active" (change)="toggleStatus(u)" [disabled]="savingStatus() || isSelf()" class="sr-only peer">
                      <div class="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[6px] after:left-[6px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500 ring-inset"></div>
                    </label>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  `
})
export class AdminUserDetailsComponent implements OnInit {
  private readonly userApi = inject(UserApi);
  private readonly storeApi = inject(StoreApi);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  UserStatus = UserStatus;

  loadingInit = signal(true);
  error = signal<string | null>(null);
  user = signal<UserDto | null>(null);

  isSelf = computed(() => {
    const u = this.user();
    const identity = this.authService.identity;
    return !!(u && identity && (u.id === identity.userId || u.email === identity.email));
  });

  savingRole = signal(false);
  savingStatus = signal(false);
  savingStore = signal(false);
  activating = signal(false);

  editRole: string | null = null;
  selectedStoreIds: string[] = [];
  availableStores: StoreDto[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.loadingInit.set(false);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No User ID provided.');
      this.loadingInit.set(false);
      return;
    }

    this.loadUser(id);
    this.loadStores();
  }

  loadUser(id: string): void {
    this.userApi.getUserById(id)
      .pipe(finalize(() => this.loadingInit.set(false)))
      .subscribe({
        next: (res: ApiResponse<UserDto>) => {
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Failed to fetch user profile.');
          } else {
            this.user.set(res.data);
            this.editRole = res.data.role;
            this.selectedStoreIds = [...res.data.assignedStoreIds];
          }
        },
        error: () => this.error.set('Network error loading user')
      });
  }

  loadStores(): void {
    this.storeApi.getStores({ pageSize: 100, isActive: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.availableStores = res.data.items;
        }
      }
    });
  }

  getStatusClass(status: UserStatus): string {
    switch (status) {
      case UserStatus.PendingApproval: return 'bg-amber-50 text-amber-600 border-amber-100';
      case UserStatus.Active: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case UserStatus.Suspended:
      case UserStatus.Locked:
      case UserStatus.Rejected: return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getStatusLabel(status: UserStatus): string {
    switch (status) {
      case UserStatus.PendingApproval: return 'PENDING APPROVAL';
      case UserStatus.Active: return 'ACTIVE';
      case UserStatus.Suspended: return 'SUSPENDED';
      case UserStatus.Locked: return 'LOCKED';
      case UserStatus.Rejected: return 'REJECTED';
      case UserStatus.Invited: return 'INVITED';
      case UserStatus.Registered: return 'REGISTERED';
      default: return 'UNKNOWN';
    }
  }

  isStoreSelected(id: string): boolean {
    return this.selectedStoreIds.includes(id);
  }

  toggleStore(id: string): void {
    if (this.isStoreSelected(id)) {
      this.selectedStoreIds = this.selectedStoreIds.filter(s => s !== id);
    } else {
      this.selectedStoreIds.push(id);
    }
  }

  hasStoreChanges(): boolean {
    const u = this.user();
    if (!u) return false;
    if (u.assignedStoreIds.length !== this.selectedStoreIds.length) return true;
    return !u.assignedStoreIds.every(id => this.selectedStoreIds.includes(id));
  }

  saveRole(): void {
    const u = this.user();
    if (!u || !this.editRole) return;

    this.savingRole.set(true);
    this.error.set(null);

    this.userApi.updateUserRole(u.id, this.editRole)
      .pipe(finalize(() => this.savingRole.set(false)))
      .subscribe({
        next: (res: ApiResponse<UserDto>) => {
          if (!res.success || !res.data) {
            const msg = res.message || 'Failed to update role';
            this.error.set(msg);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
          } else {
            this.user.set(res.data);
            this.editRole = res.data.role; 
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Security role updated to ${res.data.role}` }));
          }
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Network error updating role';
          this.error.set(`Access Violation: ${msg}`);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
        }
      });
  }

  saveStore(): void {
    const u = this.user();
    if (!u) return;

    if (this.selectedStoreIds.length === 0) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Please select at least one store facility' }));
      return;
    }

    this.savingStore.set(true);
    this.error.set(null);

    this.userApi.updateUserStores(u.id, this.selectedStoreIds)
      .pipe(finalize(() => this.savingStore.set(false)))
      .subscribe({
        next: (res: ApiResponse<UserDto>) => {
          if (!res.success || !res.data) {
            const msg = res.message || 'Failed to update stores';
            this.error.set(msg);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
          } else {
            this.user.set(res.data);
            this.selectedStoreIds = [...res.data.assignedStoreIds];
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Facility access updated for ${res.data.userName}` }));
          }
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Network error updating stores';
          this.error.set(`Access Violation: ${msg}`);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
        }
      });
  }

  toggleStatus(u: UserDto): void {
    this.savingStatus.set(true);
    this.error.set(null);

    const nextStatus = u.status === UserStatus.Active ? UserStatus.Locked : UserStatus.Active;
    const req: UpdateUserStatusRequest = { status: nextStatus };
    
    this.userApi.updateUserStatus(u.id, req)
      .pipe(finalize(() => this.savingStatus.set(false)))
      .subscribe({
        next: (res: ApiResponse<UserDto>) => {
          if (!res.success || !res.data) {
            const msg = res.message || 'Security violation: status update rejected';
            this.error.set(msg);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
          } else {
            this.user.set(res.data);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `User access ${res.data.status === UserStatus.Active ? 'restored' : 'revoked'}` }));
          }
        },
        error: (err) => {
          const msg = err.error?.message || err.message || 'Network failure during security override';
          this.error.set(`Access Violation: ${msg}`);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: msg }));
        }
      });
  }

  activateUser(): void {
    const u = this.user();
    if (!u) return;

    this.activating.set(true);
    this.error.set(null);

    this.userApi.activateUser(u.id)
      .pipe(finalize(() => this.activating.set(false)))
      .subscribe({
        next: (res: ApiResponse<UserDto>) => {
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Failed to activate user');
          } else {
            this.user.set(res.data);
          }
        },
        error: () => this.error.set('Network error during activation')
      });
  }
}
