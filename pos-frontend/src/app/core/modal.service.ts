import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BillDto } from './bill.api';

export type ModalType = 'REFUND' | null;

export interface ModalState {
  type: ModalType;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private state$ = new BehaviorSubject<ModalState>({ type: null });
  public activeModal$ = this.state$.asObservable();

  openRefundModal(bill: BillDto) {
    this.state$.next({ type: 'REFUND', data: bill });
    this.toggleScroll(false);
  }

  close() {
    this.state$.next({ type: null });
    this.toggleScroll(true);
  }

  private toggleScroll(enabled: boolean) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = enabled ? 'auto' : 'hidden';
    }
  }
}
