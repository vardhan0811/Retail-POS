import { Injectable, computed, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { GetUsersQuery, PagedResult, UserApi, UserDto } from '../../core/user.api';
import { UserStatus } from '../../core/auth.models';

export type UserStatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'locked' | 'rejected';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(8);
  readonly role = signal<string>('');
  readonly status = signal<UserStatusFilter>('all');
  readonly storeId = signal<string>('');

  readonly result = signal<PagedResult<UserDto> | null>(null);
  readonly users = computed(() => this.result()?.items ?? []);
  readonly totalCount = computed(() => this.result()?.totalCount ?? 0);

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    const total = this.totalCount();
    return Math.max(1, Math.ceil(total / size));
  });

  constructor(private readonly api: UserApi) {}

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    let statusVal: UserStatus | undefined = undefined;
    if (this.status() === 'pending') statusVal = UserStatus.PendingApproval;
    else if (this.status() === 'active') statusVal = UserStatus.Active;
    else if (this.status() === 'suspended') statusVal = UserStatus.Suspended;
    else if (this.status() === 'locked') statusVal = UserStatus.Locked;
    else if (this.status() === 'rejected') statusVal = UserStatus.Rejected;

    const query: GetUsersQuery = {
      page: this.page(),
      pageSize: this.pageSize(),
      role: this.role() || undefined,
      storeId: this.storeId() || undefined,
      status: statusVal
    };

    this.api
      .getUsers(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Failed to load users');
            this.result.set({ items: [], totalCount: 0 });
            return;
          }
          this.result.set(res.data);
        },
        error: () => {
          this.error.set('Failed to load users');
          this.result.set({ items: [], totalCount: 0 });
        },
      });
  }

  updateUserLocally(userId: string, updates: Partial<UserDto>): void {
    const current = this.result();
    if (!current) return;
    
    const updatedItems = current.items.map(u => 
      u.id === userId ? { ...u, ...updates } : u
    );
    
    this.result.set({ ...current, items: updatedItems });
  }

  setPage(nextPage: number): void {
    const clamped = Math.min(Math.max(1, nextPage), this.totalPages());
    if (clamped === this.page()) return;
    this.page.set(clamped);
    this.refresh();
  }

  setPageSize(size: number): void {
    if (size < 1) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.refresh();
  }

  applyFilters(): void {
    this.page.set(1);
    this.refresh();
  }
}
