export type UserRole = 'Admin' | 'Cashier' | 'Manager' | string;

export enum UserStatus {
  Invited = 0,
  Registered = 1,
  PendingApproval = 2,
  Active = 3,
  Suspended = 4,
  Locked = 5,
  Rejected = 6
}

export interface GoogleConfig {
	clientId: string;
}

export interface LoginRequest {
	email: string;
	password: string;
  terminalId?: string;
}

/**
 * Matches backend /api/Auth/login response.
 * Note: property names are kept flexible via optional fields to avoid breaking on minor contract differences.
 */
export interface LoginResponse {
	token: string;
	role?: UserRole | null;
	userId?: string;
	email?: string;
	status?: UserStatus;
	storeId?: string | null;
  sessionId?: string;
  terminalId?: string;
  mode?: 'ADMIN' | 'POS';
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T | null;
}

export interface AuthIdentity {
	token: string;
	role: UserRole | null;
	status: UserStatus;
	storeId: string | null;
  email?: string;
  name?: string;
  userId?: string;
  sessionId?: string;
  terminalId?: string;
  mode?: 'ADMIN' | 'POS';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string | null;
  status: string;
  storeId: string | null;
  permissions: string[];
  activeSessionId?: string;
  activeTerminalName?: string;
  lastLogin?: string;
}

export interface SessionInfo {
  sessionId: string;
  terminalId?: string;
  terminalName: string;
  loginTime: string;
  lastActivity?: string;
  isActive: boolean;
}

export interface AuthAuditLog {
  id: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  details?: string;
  terminalName?: string;
}

export interface OperatorSummary {
  totalBillsToday: number;
  totalRevenueToday: number;
  recentTransactions: any[];
}
