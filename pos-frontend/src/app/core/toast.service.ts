import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastSubject.asObservable();

  success(message: string) {
    this.add(message, 'success');
  }

  error(message: string) {
    this.add(message, 'error', 5000);
  }

  info(message: string) {
    this.add(message, 'info');
  }

  warning(message: string) {
    this.add(message, 'warning');
  }

  private add(message: string, type: ToastMessage['type'], duration: number = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    const current = this.toastSubject.value;
    this.toastSubject.next([...current, { id, message, type }]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: string) {
    const current = this.toastSubject.value;
    this.toastSubject.next(current.filter(t => t.id !== id));
  }
}
