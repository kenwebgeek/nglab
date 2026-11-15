import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  // Esc fires the native cancel event; the parent decides when to close
  onCancel(event: Event) {
    event.preventDefault();
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) {
      this.cancelled.emit();
    }
  }
}
