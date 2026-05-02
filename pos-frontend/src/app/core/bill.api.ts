import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Api } from './api';

export interface BillItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateBillRequest {
  items: BillItemRequest[];
}

export interface CreatePaymentRequest {
  billId: string;
  method: string;
}

export interface FinalizeBillRequest {
  paymentId: string;
}

export interface BillItemDto {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  mrp: number;
  unitPrice: number;
  taxPercentage: number;
  totalPrice: number;
  isRefundable: boolean;
  refundWindowHours: number;
  refundedQuantity: number;
  isRefunded: boolean;
  isRefundEligible: boolean;
  refundDeadline: string | null;
}


export interface RefundItemRequest {
  productId: string;
  quantity: number;
}

export interface RefundRequest {
  reason: string;
  items: RefundItemRequest[];
}

export enum RefundStatus {
  Requested = 'REQUESTED',
  UnderReview = 'UNDER_REVIEW',
  Approved = 'APPROVED',
  Settled = 'SETTLED',
  Rejected = 'REJECTED',
  Failed = 'FAILED',
  PendingApproval = 'PENDING_APPROVAL', // Backward compatibility
  Completed = 'COMPLETED'             // Backward compatibility
}

export interface RefundRequestDto {
  id: string;
  billId: string;
  billNumber: string;
  status: RefundStatus;
  reason: string;
  adminNotes?: string;
  storeId: string;
  storeName: string;
  requestedByName: string;
  requestedByEmail: string;
  createdAt: string;
  items: RefundItemDto[];
  totalRefundAmount: number;
}

export interface RefundItemDto {
  id: string;
  billItemId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  taxReversalAmount: number;
}

export enum BillStatus {
  Draft = 'Draft',
  Authorized = 'Authorized',
  Finalized = 'Finalized',
  Refunded = 'Refunded',
  Cancelled = 'Cancelled',
  AwaitingPayment = 'AwaitingPayment',
  Suspended = 'Suspended',
  RefundRequested = 'RefundRequested',
  Expired = 'Expired',
  PartialRefund = 'PartialRefund'
}

export interface ReceiptItemDto {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptDto {
  billId: string;
  billNumber: string;
  date: string;
  status: string;
  cashierId: string;
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentId: string;
  transactionReference: string;
  paidAt: string;
  storeName: string;
  storeAddress: string;
  items: ReceiptItemDto[];
  footer?: string;
}

export interface BillAuditLogDto {
  action: string;
  status: string;
  timestamp: string;
  actor: string;
}

export interface BillPricingDto {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface BillDto {
  id: string;
  billNumber: string;
  storeId: string;
  userId: string;
  totalAmount: number;
  taxAmount: number;
  finalAmount: number;
  discountAmount?: number;
  paymentId?: string;
  createdAt: string;
  completedAt?: string;
  status: BillStatus;
  refundStatus?: RefundStatus;
  refundApprovedAt?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  ttlMinutes: number;
  expiresAt?: string;
  isExpired: boolean;
  items: BillItemDto[];
  pricing: BillPricingDto;
  auditTrail: BillAuditLogDto[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class BillApi {
  private readonly baseUrl = '/api/bills';
  private readonly api = inject(Api);

  create(request: CreateBillRequest): Observable<BillDto> {
    return this.api.client.post<ApiResponse<BillDto>>(this.api.url(this.baseUrl), request)
      .pipe(map(res => res.data!));
  }

  createPayment(request: CreatePaymentRequest): Observable<any> {
    return this.api.client.post<ApiResponse<any>>(this.api.url('/api/payments'), request)
      .pipe(map(res => res.data));
  }

  startPayment(id: string): Observable<BillDto> {
    return this.api.client.post<ApiResponse<BillDto>>(this.api.url(`${this.baseUrl}/${id}/start-payment`), {})
      .pipe(map(res => res.data!));
  }

  hold(id: string): Observable<any> {
    return this.api.client.post<ApiResponse<any>>(this.api.url(`${this.baseUrl}/${id}/hold`), {})
      .pipe(map(res => res.data));
  }

  resume(id: string): Observable<any> {
    return this.api.client.post<ApiResponse<any>>(this.api.url(`${this.baseUrl}/${id}/resume`), {})
      .pipe(map(res => res.data));
  }

  cancel(id: string): Observable<any> {
    return this.api.client.post<ApiResponse<any>>(this.api.url(`${this.baseUrl}/${id}/cancel`), {})
      .pipe(map(res => res.data));
  }

  finalize(id: string, request: FinalizeBillRequest): Observable<any> {
    const headers = { 'Idempotency-Key': crypto.randomUUID() };
    return this.api.client.post<ApiResponse<any>>(this.api.url(`${this.baseUrl}/${id}/finalize`), request, { headers })
      .pipe(map(res => res.data));
  }

  requestRefund(request: { billId: string, reason?: string, items?: RefundItemRequest[] }): Observable<RefundRequestDto> {
    return this.api.client.post<ApiResponse<RefundRequestDto>>(this.api.url('/api/refunds/request'), request)
      .pipe(map(res => res.data!));
  }

  getRefundRequests(params?: any): Observable<RefundRequestDto[]> {
    return this.api.client.get<ApiResponse<RefundRequestDto[]>>(this.api.url('/api/refunds'), { params })
      .pipe(map(res => res.data!));
  }

  approveRefundV2(id: string): Observable<RefundRequestDto> {
    return this.api.client.post<ApiResponse<RefundRequestDto>>(this.api.url(`/api/refunds/${id}/approve`), {})
      .pipe(map(res => res.data!));
  }

  rejectRefundV2(id: string, reason: string): Observable<RefundRequestDto> {
    return this.api.client.post<ApiResponse<RefundRequestDto>>(this.api.url(`/api/refunds/${id}/reject`), JSON.stringify(reason), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(map(res => res.data!));
  }

  settleRefundV2(id: string): Observable<RefundRequestDto> {
    return this.api.client.post<ApiResponse<RefundRequestDto>>(this.api.url(`/api/refunds/${id}/settle`), {})
      .pipe(map(res => res.data!));
  }

  getReceipt(id: string): Observable<ReceiptDto> {
    return this.api.client.get<ApiResponse<ReceiptDto>>(this.api.url(`${this.baseUrl}/${id}/receipt`))
      .pipe(map(res => res.data!));
  }

  sendEmailReceipt(id: string, email: string): Observable<any> {
    const url = this.api.url(`${this.baseUrl}/${id}/receipt/email`);
    return this.api.client.post<ApiResponse<any>>(url, {}, { params: { email } })
      .pipe(map(res => res.data));
  }

  downloadReceiptPdf(id: string): Observable<Blob> {
    const url = this.api.url(`${this.baseUrl}/${id}/receipt/pdf`);
    return this.api.client.get(url, { responseType: 'blob' });
  }

  getPaged(params: any): Observable<PagedResponse<BillDto>> {
    return this.api.client.get<ApiResponse<PagedResponse<BillDto>>>(this.api.url(this.baseUrl), { params })
      .pipe(map(res => res.data!));
  }

  getDashboardSummary(): Observable<SalesDashboardSummaryDto> {
    return this.api.client.get<ApiResponse<SalesDashboardSummaryDto>>(this.api.url(`${this.baseUrl}/dashboard/summary`))
      .pipe(map(res => res.data!));
  }

  getOperatorSummary(): Observable<import('./auth.models').OperatorSummary> {
    return this.api.client.get<ApiResponse<import('./auth.models').OperatorSummary>>(this.api.url(`${this.baseUrl}/dashboard/operator-summary`))
      .pipe(map(res => res.data!));
  }

  getById(id: string): Observable<BillDto> {
    return this.api.client.get<ApiResponse<BillDto>>(this.api.url(`${this.baseUrl}/${id}`))
      .pipe(map(res => res.data!));
  }
}

export interface DailySalesDto {
  date: string;
  revenue: number;
}

export interface SalesDashboardSummaryDto {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueChangePercentage: number;
  todayTransactions: number;
  todayAvgBillValue: number;
  lastSevenDays: DailySalesDto[];
}

export type BillAction = 'finalize' | 'suspend' | 'cancel' | 'resume' | 'print' | 'refund';

export function canPerformBillAction(status: BillStatus | string, action: BillAction): boolean {
  switch (action) {
    case 'finalize':
    case 'suspend':
      return status === BillStatus.Authorized;
    case 'cancel':
      return status === BillStatus.Authorized || status === BillStatus.Suspended;
    case 'resume':
      return status === BillStatus.Suspended;
    case 'print':
    case 'refund':
      return status === BillStatus.Finalized || status === BillStatus.Refunded || status === BillStatus.PartialRefund;
    default:
      return false;
  }
}
