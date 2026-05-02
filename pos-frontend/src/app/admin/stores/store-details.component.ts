import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminStoreDetailsService } from './store-details.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin-store-details',
  standalone: true,
  imports: [NgIf, RouterLink, FormsModule],
  template: `
    <div class="max-w-[1200px] mx-auto p-10 space-y-12">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-6">
          <a routerLink="/admin/stores" class="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
          </a>
          <div>
            <h2 class="text-3xl font-black text-primary tracking-tighter">Store Configuration</h2>
            <p class="text-xs font-bold text-muted uppercase tracking-[0.2em] mt-1.5 opacity-60">Manage operational parameters for this location</p>
          </div>
        </div>
        
        <div *ngIf="saveSuccess()" class="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 text-sm font-bold animate-in slide-in-from-right-10">
          Changes Synced Successfully
        </div>
      </div>

      <div *ngIf="loadingInit()" class="py-20 flex flex-col items-center justify-center text-muted gap-4 animate-pulse">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
        <span class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Loading Configuration...</span>
      </div>
      
      <div *ngIf="error()" class="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span class="font-bold text-sm">{{ error() }}</span>
      </div>

      <div *ngIf="store() as st" class="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <!-- Main Form -->
        <div class="lg:col-span-2 space-y-10">
          <div class="pos-card p-10 bg-white border border-slate-100 shadow-xl shadow-slate-100/50">
            <h3 class="text-xs font-black text-muted uppercase tracking-[0.2em] mb-10 opacity-60">General Information</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-2.5">
                <label class="text-[10px] font-black text-primary uppercase tracking-widest px-1">Store Name</label>
                <input type="text" [(ngModel)]="editName" [disabled]="saving()" 
                       class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all placeholder:opacity-30" />
              </div>
              
              <div class="space-y-2.5">
                <label class="text-[10px] font-black text-primary uppercase tracking-widest px-1">Region / Location</label>
                <input type="text" [(ngModel)]="editLocation" [disabled]="saving()" 
                       class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all" />
              </div>

              <div class="md:col-span-2 space-y-2.5">
                <label class="text-[10px] font-black text-primary uppercase tracking-widest px-1">Full Physical Address</label>
                <textarea [(ngModel)]="editAddress" [disabled]="saving()" rows="3"
                          class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all resize-none"></textarea>
              </div>

              <div class="md:col-span-2 flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 class="text-sm font-black text-primary">Deployment Status</h4>
                  <p class="text-[10px] font-medium text-muted uppercase tracking-widest">Toggle operational availability</p>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-[10px] font-black uppercase tracking-widest" [class.text-emerald-500]="editIsActive" [class.text-red-400]="!editIsActive">
                    {{ editIsActive ? 'Online' : 'Offline' }}
                  </span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="editIsActive" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            <div class="mt-12 flex items-center gap-4">
              <button class="pos-btn pos-btn-primary px-10 py-4" [disabled]="saving() || !hasChanges()" (click)="saveStore()">
                <div class="flex items-center gap-3">
                   <div *ngIf="saving()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>{{ saving() ? 'Saving Changes...' : 'Synchronize Config' }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar / Danger Zone -->
        <div class="space-y-10">
          <div class="pos-card p-10 bg-white border border-slate-100 shadow-xl shadow-slate-100/30">
            <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6 opacity-60">Operations Info</h3>
            <div class="space-y-6 text-sm font-bold text-primary">
              <div class="flex justify-between border-b border-slate-50 pb-4">
                <span class="opacity-40 uppercase text-[9px] tracking-widest">Node ID</span>
                <code class="text-[10px] bg-slate-50 px-2 py-1 rounded">#{{ st.id.slice(0,8) }}</code>
              </div>
              <div class="flex justify-between border-b border-slate-50 pb-4">
                <span class="opacity-40 uppercase text-[9px] tracking-widest">Health Check</span>
                <span class="text-emerald-500 text-[10px]">PASSIVE</span>
              </div>
            </div>
          </div>

          <div class="pos-card p-10 bg-red-50/10 border border-red-100 shadow-xl shadow-red-100/10">
            <h3 class="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-6">Danger Zone</h3>
            <p class="text-[11px] font-medium text-slate-500 leading-relaxed mb-8">
              Terminal termination is permanent. All operational data and staff associations for <strong>{{ st.name }}</strong> will be purged.
            </p>
            
            <div class="space-y-4">
               <label class="text-[9px] font-black text-red-600 uppercase tracking-widest block">Type store name to confirm</label>
               <input type="text" [(ngModel)]="deleteConfirmation" placeholder="{{ st.name }}"
                      class="w-full bg-white border border-red-100 rounded-xl px-4 py-3 text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/5 transition-all placeholder:opacity-30" />
               
               <button class="w-full pos-btn bg-red-600 text-white border-red-700 hover:bg-red-700 hover:border-red-800 py-3.5 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 font-black shadow-lg shadow-red-200" 
                       [disabled]="deleting() || deleteConfirmation !== st.name" (click)="deleteStore()">
                 <div class="flex items-center justify-center gap-3">
                   <div *ngIf="deleting()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Purge Store</span>
                 </div>
               </button>
            </div>
            
            <div *ngIf="deleteError()" class="mt-4 p-4 bg-white rounded-2xl border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-widest">
              {{ deleteError() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminStoreDetailsComponent implements OnInit {
  private readonly svc = inject(AdminStoreDetailsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loadingInit = this.svc.loadingInit;
  error = this.svc.error;
  store = this.svc.store;
  saving = this.svc.saving;
  saveError = this.svc.saveError;
  saveSuccess = this.svc.saveSuccess;

  deleting = signal(false);
  deleteError = signal<string | null>(null);
  deleteConfirmation = '';

  editName = '';
  editLocation = '';
  editAddress = '';
  editIsActive = false;

  hasChanges = computed(() => {
    const s = this.store();
    if (!s) return false;
    return (
      this.editName.trim() !== (s.name || '').trim() ||
      this.editLocation.trim() !== (s.location || '').trim() ||
      this.editAddress.trim() !== (s.address || '').trim() ||
      this.editIsActive !== s.isActive
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.svc.loadStore(id);
    } else {
      this.error.set('No store ID provided.');
    }
  }

  // Sync form state when store data loads

  constructor() {
    effect(() => {
      const s = this.store();
      if (s) {
        this.editName = s.name || '';
        this.editLocation = s.location || '';
        this.editAddress = s.address || '';
        this.editIsActive = s.isActive || false;
      }
    });
  }

  saveStore(): void {
    const s = this.store();
    if (!s) return;

    this.svc.updateStore(s.id, {
      name: this.editName.trim(),
      location: this.editLocation.trim(),
      address: this.editAddress.trim(),
      isActive: this.editIsActive,
    });
  }

  deleteStore(): void {
    const s = this.store();
    if (!s) return;

    if (!confirm('Are you sure you want to completely delete this store?')) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.svc.deleteStore(s.id, (success) => {
      this.deleting.set(false);
      if (!success) {
        this.deleteError.set('Failed to delete store');
      } else {
        this.router.navigate(['/admin/stores']);
      }
    });
  }
}
