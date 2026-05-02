import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Api {
  /** All requests must go via API Gateway. */
  readonly baseUrl = 'http://localhost:5000';

  private readonly http = inject(HttpClient);

  get client(): HttpClient {
    return this.http;
  }

  url(path: string): string {
    if (!path.startsWith('/')) return `${this.baseUrl}/${path}`;
    return `${this.baseUrl}${path}`;
  }
}
