import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Api } from './api';
import { ApiResponse, GoogleConfig, LoginRequest, LoginResponse, UserStatus } from './auth.models';

export interface RegisterRequest {
  userName: string;
  email: string;
  password?: string; // Optional if backend generates it or required? Usually required. Let's make it optional and we can pass a default or allow user to set it
  role: string;
  storeId?: string | null;
}

export interface RegisterResponse {
  id: string;
  userName: string;
  email: string;
  role: string;
  storeId?: string | null;
  status: UserStatus;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApi {
  private readonly api = inject(Api);

  /** Backend contract: ApiResponse<{ token, refreshToken, email }> */
  login(payload: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.api.client.post<ApiResponse<LoginResponse>>(this.api.url('/api/Auth/login'), payload);
  }

  startSession(payload: { userId: string, storeId: string, terminalId?: string }): Observable<ApiResponse<LoginResponse>> {
    return this.api.client.post<ApiResponse<LoginResponse>>(this.api.url('/api/Auth/sessions/start'), payload);
  }

  googleLogin(idToken: string): Observable<ApiResponse<LoginResponse>> {
    return this.api.client.post<ApiResponse<LoginResponse>>(this.api.url('/api/Auth/google-login'), { idToken });
  }

  register(payload: RegisterRequest): Observable<ApiResponse<RegisterResponse>> {
    return this.api.client.post<ApiResponse<RegisterResponse>>(this.api.url('/api/Auth/register'), payload);
  }

  getGoogleConfig(): Observable<ApiResponse<GoogleConfig>> {
    return this.api.client.get<ApiResponse<GoogleConfig>>(this.api.url('/api/Auth/config/google'));
  }

  getMe(): Observable<ApiResponse<import('./auth.models').UserProfile>> {
    return this.api.client.get<ApiResponse<import('./auth.models').UserProfile>>(this.api.url('/api/Auth/me'));
  }

  getSession(): Observable<ApiResponse<import('./auth.models').SessionInfo>> {
    return this.api.client.get<ApiResponse<import('./auth.models').SessionInfo>>(this.api.url('/api/Auth/session'));
  }

  getLoginHistory(): Observable<ApiResponse<import('./auth.models').AuthAuditLog[]>> {
    return this.api.client.get<ApiResponse<import('./auth.models').AuthAuditLog[]>>(this.api.url('/api/Auth/login-history'));
  }

  logout(): Observable<ApiResponse<string>> {
    return this.api.client.post<ApiResponse<string>>(this.api.url('/api/Auth/logout'), {});
  }

  logoutAll(): Observable<ApiResponse<string>> {
    return this.api.client.post<ApiResponse<string>>(this.api.url('/api/Auth/logout-all'), {});
  }

  changePassword(payload: any): Observable<ApiResponse<string>> {
    return this.api.client.post<ApiResponse<string>>(this.api.url('/api/Auth/change-password'), payload);
  }
}

