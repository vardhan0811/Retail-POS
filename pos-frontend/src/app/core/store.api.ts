import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from './api';

export interface StoreDto {
  id: string;
  name: string;
  location: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface GetStoresQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStoreRequest {
  name: string;
  location: string;
  address: string;
}

export interface UpdateStoreRequest {
  name: string;
  location: string;
  address: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class StoreApi {
  private readonly api = inject(Api);

  getStores(query: GetStoresQuery = {}): Observable<ApiResponse<PagedResult<StoreDto>>> {
    const params = new URLSearchParams();
    if (query.isActive !== undefined) params.set('isActive', String(query.isActive));
    if (query.search) params.set('search', query.search);

    params.set('page', String(query.page ?? 1));
    params.set('pageSize', String(query.pageSize ?? 20));

    const qs = params.toString();
    return this.api.client.get<ApiResponse<PagedResult<StoreDto>>>(
      this.api.url(`/api/admin/stores${qs ? `?${qs}` : ''}`)
    );
  }

  getStoreById(id: string): Observable<ApiResponse<StoreDto>> {
    return this.api.client.get<ApiResponse<StoreDto>>(this.api.url(`/api/admin/stores/${id}`));
  }

  createStore(body: CreateStoreRequest): Observable<ApiResponse<StoreDto>> {
    return this.api.client.post<ApiResponse<StoreDto>>(this.api.url('/api/admin/stores'), body);
  }

  updateStore(id: string, body: UpdateStoreRequest): Observable<ApiResponse<StoreDto>> {
    return this.api.client.put<ApiResponse<StoreDto>>(this.api.url(`/api/admin/stores/${id}`), body);
  }

  deleteStore(id: string): Observable<ApiResponse<object>> {
    return this.api.client.delete<ApiResponse<object>>(this.api.url(`/api/admin/stores/${id}`));
  }
}
