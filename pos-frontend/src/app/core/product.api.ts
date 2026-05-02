import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Api } from './api';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  taxId: string;
  stock: number;
  mrp: number;
  sellingPrice: number;
  isActive: boolean;
  isRefundable: boolean;
  refundWindowHours: number;
  taxPercentage: number;
  imageUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastUpdatedBy?: string; // For store-specific stock
}

export interface Category {
  id: string;
  name: string;
}

export interface StockAdjustEntry {
  storeId: string;
  quantity: number;
  operation: 'INCREMENT' | 'DECREMENT' | 'ADJUST';
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

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly baseUrl = '/api/products';
  private readonly api = inject(Api);

  private cache_categories: Category[] | null = null;
  private cache_paged = new Map<string, PagedResult<Product>>();

  getPaged(params: {
    storeId?: string | null;
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    sortBy?: string;
    forceRefresh?: boolean;
  }): Observable<PagedResult<Product>> {
    const cacheKey = JSON.stringify(params);
    if (this.cache_paged.has(cacheKey) && !params.forceRefresh) {
      return of(this.cache_paged.get(cacheKey)!);
    }

    let httpParams = new HttpParams();
    if (params.storeId) httpParams = httpParams.set('storeId', params.storeId);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    
    return this.api.client.get<ApiResponse<PagedResult<Product>>>(this.api.url(`${this.baseUrl}`), { params: httpParams })
      .pipe(
        map(res => res.data || { items: [], totalCount: 0 }),
        tap(data => this.cache_paged.set(cacheKey, data))
      );
  }

  getById(id: string): Observable<Product> {
    return this.api.client.get<ApiResponse<Product>>(this.api.url(`${this.baseUrl}/${id}`))
      .pipe(map(res => res.data!));
  }

  create(body: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.api.client.post<ApiResponse<Product>>(this.api.url(`${this.baseUrl}`), body)
      .pipe(tap(() => this.clearCache()));
  }

  update(id: string, body: Partial<Product>): Observable<ApiResponse<object>> {
    return this.api.client.put<ApiResponse<object>>(this.api.url(`${this.baseUrl}/${id}`), body)
      .pipe(tap(() => this.clearCache()));
  }

  patch(id: string, body: Partial<Product>): Observable<ApiResponse<object>> {
    return this.api.client.patch<ApiResponse<object>>(this.api.url(`${this.baseUrl}/${id}`), body)
      .pipe(tap(() => this.clearCache()));
  }

  delete(id: string): Observable<ApiResponse<object>> {
    return this.api.client.delete<ApiResponse<object>>(this.api.url(`${this.baseUrl}/${id}`))
      .pipe(tap(() => this.clearCache()));
  }

  adjustStock(productId: string, request: StockAdjustEntry): Observable<ApiResponse<object>> {
    return this.api.client.put<ApiResponse<object>>(this.api.url(`${this.baseUrl}/${productId}/stock`), request)
      .pipe(tap(() => this.clearCache()));
  }

  updateInventory(req: { productId: string, change: number, storeId: string }): Observable<ApiResponse<{ productId: string, newStock: number, updatedAt: string, lastUpdatedBy: string }>> {
    return this.api.client.post<ApiResponse<{ productId: string, newStock: number, updatedAt: string, lastUpdatedBy: string }>>(this.api.url(`${this.baseUrl}/inventory/update`), req)
      .pipe(tap(() => this.clearCache()));
  }

  getCategories(): Observable<Category[]> {
    if (this.cache_categories) return of(this.cache_categories);

    return this.api.client.get<ApiResponse<Category[]>>(this.api.url(`${this.baseUrl}/categories`))
      .pipe(
        map(res => res.data || []),
        tap(cats => this.cache_categories = cats)
      );
  }

  createCategory(name: string): Observable<ApiResponse<Category>> {
    return this.api.client.post<ApiResponse<Category>>(this.api.url(`${this.baseUrl}/categories`), { name })
      .pipe(tap(() => {
        this.cache_categories = null;
      }));
  }

  private clearCache(): void {
    this.cache_paged.clear();
  }
}

