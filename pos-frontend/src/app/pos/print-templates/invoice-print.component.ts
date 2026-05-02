import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRINT_THEME } from '../../core/print-theme';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicePrintComponent {
  @Input() data: any; // ReceiptDto
  theme = PRINT_THEME;

  get formattedDate(): string {
    if (!this.data?.date) return '';
    return new Date(this.data.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
