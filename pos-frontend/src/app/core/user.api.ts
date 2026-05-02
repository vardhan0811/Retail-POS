import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from './api';
import { UserStatus } from './auth.models';

export interface UserDto {
  id: string;
  userName: string;
  email: string;
  role: string | null;
  status: UserStatus;
  storeId: string | null;
  storeName?: string;
  assignedStoreIds: string[];
  assignedStoreNames: string[];
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

export interface GetUsersQuery {
  storeId?: string;
  role?: string;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdateUserStoreRequest {
  storeId: string;
}

export interface UpdateUserStoresRequest {
  storeIds: string[];
}

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly api = inject(Api);

  getUsers(query: GetUsersQuery = {}): Observable<ApiResponse<PagedResult<UserDto>>> {
    const params = new URLSearchParams();
    if (query.storeId) params.set('storeId', query.storeId);
    if (query.role) params.set('role', query.role);
    if (query.status !== undefined) params.set('status', String(query.status));

    params.set('page', String(query.page ?? 1));
    params.set('pageSize', String(query.pageSize ?? 20));

    const qs = params.toString();
    return this.api.client.get<ApiResponse<PagedResult<UserDto>>>(
      this.api.url(`/api/admin/users${qs ? `?${qs}` : ''}`)
    );
  }

  getUserById(id: string): Observable<ApiResponse<UserDto>> {
    return this.api.client.get<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}`));
  }

  updateUserRole(id: string, role: string): Observable<ApiResponse<UserDto>> {
    return this.api.client.put<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/role`), { role });
  }

  updateUserStatus(id: string, body: UpdateUserStatusRequest): Observable<ApiResponse<UserDto>> {
    return this.api.client.put<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/status`), body);
  }

  assignStore(id: string, body: UpdateUserStoreRequest): Observable<ApiResponse<UserDto>> {
    return this.api.client.put<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/stores`), body);
  }

  updateUserStores(id: string, storeIds: string[]): Observable<ApiResponse<UserDto>> {
    const body: UpdateUserStoresRequest = { storeIds };
    return this.api.client.put<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/stores`), body);
  }

  activateUser(id: string): Observable<ApiResponse<UserDto>> {
    return this.api.client.post<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/approve`), {});
  }

  rejectUser(id: string, reason: string): Observable<ApiResponse<UserDto>> {
    return this.api.client.post<ApiResponse<UserDto>>(this.api.url(`/api/admin/users/${id}/reject`), { reason });
  }
}
