import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts()" 
           class="toast-item" 
           [class]="toast.type"
           (click)="remove(toast.id)">
        <div class="toast-icon">
          <i *ngIf="toast.type === 'success'" class="fas fa-check-circle text-green-400"></i>
          <i *ngIf="toast.type === 'error'" class="fas fa-exclamation-circle text-red-400"></i>
          <i *ngIf="toast.type === 'info'" class="fas fa-info-circle text-blue-400"></i>
          <i *ngIf="toast.type === 'warning'" class="fas fa-exclamation-triangle text-amber-400"></i>
        </div>
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
        </div>
        <button class="toast-close">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      min-width: 320px;
      max-width: 450px;
      background: #111111;
      border-left: 4px solid transparent;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 14px;
      color: white;
      cursor: pointer;
      animation: toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transition: all 0.2s ease;
    }

    .toast-item:hover {
      transform: translateX(-4px);
      background: #1a1a1a;
    }

    .toast-item.success { border-left-color: #10b981; }
    .toast-item.error { border-left-color: #ef4444; }
    .toast-item.info { border-left-color: #3b82f6; }
    .toast-item.warning { border-left-color: #f59e0b; }

    .toast-icon {
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 500;
      line-height: 1.4;
      color: #f3f4f6;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1.25rem;
      padding: 0;
      cursor: pointer;
      line-height: 1;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .toast-item:hover .toast-close {
      opacity: 1;
    }

    @keyframes toast-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts = signal<ToastMessage[]>([]);
  private sub?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toasts$.subscribe((msgs: ToastMessage[]) => {
      this.toasts.set(msgs);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  remove(id: string) {
    this.toastService.remove(id);
  }
}
