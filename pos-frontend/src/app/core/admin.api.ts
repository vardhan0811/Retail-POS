import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from './api';

export interface SummaryBox {
  total: number;
  active: number;
  inactive: number;
  lastUpdate?: string;
}

export interface DailySalesTrend {
  date: string;
  revenue: number;
}

export interface BillingSummary {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueChangePercentage: number;
  todayTransactions: number;
  todayAvgBillValue: number;
  todayRefundAmount: number;
  todayCancelledOrders: number;
  activeStaffCount: number;
  totalGrossRevenue: number;
  salesTrend: DailySalesTrend[];
}

export interface DashboardAlerts {
  pendingRefunds: number;
  lowStockItems: number;
  outOfStockItems: number;
  failedTransactions: number;
}

export interface DashboardActivity {
  type: string;
  message: string;
  timestamp: string;
  status: string;
}

export interface ProductInsight {
  id: string;
  name: string;
  sku: string;
  stock: number;
  sellingPrice: number;
}

export interface InventoryInsights {
  topSelling: ProductInsight[];
  lowStockItems: ProductInsight[];
}

export interface DashboardStats {
  users: SummaryBox;
  stores: SummaryBox;
  billingSummary: BillingSummary;
  alerts: DashboardAlerts;
  recentActivity: DashboardActivity[];
  inventoryInsights: InventoryInsights;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(Api);

  getDashboard(storeId?: string | null): Observable<ApiResponse<DashboardStats>> {
    let url = this.api.url('/api/admin/dashboard');
    if (storeId) url += `?storeId=${storeId}`;
    return this.api.client.get<ApiResponse<DashboardStats>>(url);
  }
}
