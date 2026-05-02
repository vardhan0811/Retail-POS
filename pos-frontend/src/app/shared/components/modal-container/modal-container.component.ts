import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/modal.service';
import { RefundModalComponent } from '../../../pos/refund-modal/refund-modal.component';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule, RefundModalComponent],
  template: `
    <div *ngIf="state$ | async as state" class="modal-root">
      <div *ngIf="state.type" class="modal-overlay animate-fade-in" (click)="onBackdropClick($event)">
        <div class="modal-content animate-scale-in" (click)="$event.stopPropagation()">
          <app-refund-modal *ngIf="state.type === 'REFUND'" [bill]="state.data"></app-refund-modal>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-root {
      position: relative;
      z-index: 1000;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-content {
      position: relative;
      z-index: 1100;
      background: #ffffff;
      border-radius: 32px;
      width: 600px;
      max-width: 95vw;
      box-shadow: 0 40px 100px -20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
      overflow: hidden;
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    .animate-scale-in {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ModalContainerComponent {
  private readonly modal = inject(ModalService);
  protected readonly state$ = this.modal.activeModal$;

  @HostListener('document:keydown.escape')
  onEsc() {
    this.modal.close();
  }

  onBackdropClick(event: MouseEvent) {
    this.modal.close();
  }
}
