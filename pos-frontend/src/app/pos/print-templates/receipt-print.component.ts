import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRINT_THEME } from '../../core/print-theme';

@Component({
  selector: 'app-receipt-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt-print.component.html',
  styleUrls: ['./receipt-print.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptPrintComponent {
  @Input() data: any; // ReceiptDto
  theme = PRINT_THEME;

  get formattedDate(): string {
    if (!this.data?.date) return '';
    return new Date(this.data.date).toLocaleString();
  }
}
