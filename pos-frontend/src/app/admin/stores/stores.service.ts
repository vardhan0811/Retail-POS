import { Injectable, computed, signal } from '@angular/core';
import { Observable, finalize, of } from 'rxjs';
import { GetStoresQuery, PagedResult, StoreApi, StoreDto } from '../../core/store.api';
import { map, catchError } from 'rxjs/operators';

export type StoreStatusFilter = 'all' | 'active' | 'inactive';

@Injectable({ providedIn: 'root' })
export class AdminStoresService {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = signal(20);

  readonly searchTerm = signal('');
  readonly status = signal<StoreStatusFilter>('all');

  readonly result = signal<PagedResult<StoreDto> | null>(null);
  readonly stores = computed(() => this.result()?.items ?? []);
  readonly totalCount = computed(() => this.result()?.totalCount ?? 0);

  readonly totalPages = computed(() => {
    const size = this.pageSize();
    const total = this.totalCount();
    return Math.max(1, Math.ceil(total / size));
  });

  constructor(private readonly api: StoreApi) {}

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    const query: GetStoresQuery = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.searchTerm() || undefined,
      isActive:
        this.status() === 'all' ? undefined : this.status() === 'active' ? true : false,
    };

    this.api
      .getStores(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Failed to load stores');
            this.result.set({ items: [], totalCount: 0 });
            return;
          }
          this.result.set(res.data);
        },
        error: () => {
          this.error.set('Failed to load stores');
          this.result.set({ items: [], totalCount: 0 });
        },
      });
  }

  createStore(name: string, location: string, address: string): Observable<boolean> {
    return this.api.createStore({ name, location, address }).pipe(
      map(res => !!res.success),
      catchError(() => of(false))
    );
  }

  applyFilters(): void {
    this.page.set(1);
    this.refresh();
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
}
