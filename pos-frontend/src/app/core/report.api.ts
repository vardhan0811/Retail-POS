import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Api } from './api';

// ─── Filter ────────────────────────────────────────────────────────────────────
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  status?: string;
  timezone?: string;
  granularity?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────
export interface KpiSummaryDto {
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  totalOrders: number;
  avgTicket: number;
  totalTax: number;
  cancelledOrders: number;
  refundRate: number;
}

export interface SalesTrendPointDto {
  label: string;
  revenue: number;
  orders: number;
  refunds: number;
}

export interface RefundAnalyticsDto {
  totalRefundAmount: number;
  refundRate: number;
  topRefundedProducts: RefundedProductDto[];
  reasons: RefundReasonDto[];
}

export interface RefundedProductDto {
  productName: string;
  refundCount: number;
  refundAmount: number;
}

export interface RefundReasonDto {
  reason: string;
  count: number;
}

export interface PaymentMethodDto {
  method: string;
  amount: number;
  count: number;
}

export interface ProductMetricDto {
  productId: string;
  productName: string;
  totalQuantity: number;
  refundCount: number;
  netQuantitySold: number;
  totalRevenue: number;
}

export interface BillViewDto {
  id: string;
  billNumber: string;
  storeId: string;
  storeName?: string;
  userId: string;
  totalAmount: number;
  taxAmount: number;
  finalAmount: number;
  createdAt: string;
  status: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SalesSummaryDto {
  totalRevenue: number;
  totalTaxes: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReportApi {
  private readonly api = inject(Api);
  private readonly base = '/api/admin/reports';

  private clean(params: any): any {
    if (!params) return {};
    return Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== null && v !== undefined && v !== '' && v !== 'undefined' && v !== 'null'
      )
    );
  }

  // ─── BI Endpoints ────────────────────────────────────────────────────────
  getKpiSummary(f: ReportFilter): Observable<KpiSummaryDto | null> {
    return this.api.client
      .get<ApiResponse<KpiSummaryDto>>(this.api.url(`${this.base}/kpi-summary`), { params: this.clean(f) })
      .pipe(map(r => r.data), catchError(() => of(null)));
  }

  getSalesTrend(f: ReportFilter): Observable<SalesTrendPointDto[]> {
    return this.api.client
      .get<ApiResponse<SalesTrendPointDto[]>>(this.api.url(`${this.base}/sales-trend`), { params: this.clean(f) })
      .pipe(map(r => r.data ?? []), catchError(() => of([])));
  }

  getSales(f: ReportFilter): Observable<ApiResponse<PagedResult<BillViewDto>>> {
    return this.api.client
      .get<ApiResponse<PagedResult<BillViewDto>>>(this.api.url(`${this.base}/sales`), { params: this.clean(f) })
      .pipe(catchError(() => of({ success: false, message: 'error', data: null })));
  }

  getTopProducts(f: ReportFilter, count = 10): Observable<ProductMetricDto[]> {
    return this.api.client
      .get<ApiResponse<ProductMetricDto[]>>(this.api.url(`${this.base}/top-products`), { params: this.clean({ ...f, count }) })
      .pipe(map(r => r.data ?? []), catchError(() => of([])));
  }

  getRefundAnalytics(f: ReportFilter): Observable<RefundAnalyticsDto | null> {
    return this.api.client
      .get<ApiResponse<RefundAnalyticsDto>>(this.api.url(`${this.base}/refund-analytics`), { params: this.clean(f) })
      .pipe(map(r => r.data), catchError(() => of(null)));
  }

  getPaymentBreakdown(f: ReportFilter): Observable<PaymentMethodDto[]> {
    return this.api.client
      .get<ApiResponse<PaymentMethodDto[]>>(this.api.url(`${this.base}/payment-breakdown`), { params: this.clean(f) })
      .pipe(map(r => r.data ?? []), catchError(() => of([])));
  }

  getExportCsvUrl(f: ReportFilter): string {
    const qs = Object.entries(this.clean(f))
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return this.api.url(`${this.base}/export-csv?${qs}`);
  }

  // ─── Legacy (kept for backward compat) ──────────────────────────────────
  getSummary(params: any): Observable<ApiResponse<SalesSummaryDto>> {
    return this.api.client.get<ApiResponse<SalesSummaryDto>>(
      this.api.url(`${this.base}/summary`), { params: this.clean(params) }
    );
  }
}
