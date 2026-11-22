import { Component, ElementRef, effect, input, output, signal, untracked, viewChild } from '@angular/core';

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
  readonly status = input<'idle' | 'pending' | 'success'>('idle');
  readonly errorMessage = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly closing = signal(false);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private cancelClose?: () => void;

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      const open = this.open();
      untracked(() => (open ? this.show(dialog) : this.hide(dialog)));
    });
  }

  // Esc fires the native cancel event; the parent decides when to close
  onCancel(event: Event) {
    event.preventDefault();
    if (this.status() === 'idle') {
      this.cancelled.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (this.status() === 'idle' && event.target === this.dialog().nativeElement) {
      this.cancelled.emit();
    }
  }

  private show(dialog: HTMLDialogElement) {
    // Reopened while the exit animation was still playing
    this.cancelClose?.();
    this.closing.set(false);
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  // Plays the exit animation, then closes the native dialog
  private hide(dialog: HTMLDialogElement) {
    if (!dialog.open || this.cancelClose) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dialog.close();
      return;
    }

    const finish = () => {
      this.cancelClose?.();
      this.closing.set(false);
      dialog.close();
    };
    // The timeout covers a missed animationend (e.g. a hidden tab)
    const timeout = setTimeout(finish, 300);
    dialog.addEventListener('animationend', finish);
    this.cancelClose = () => {
      clearTimeout(timeout);
      dialog.removeEventListener('animationend', finish);
      this.cancelClose = undefined;
    };
    this.closing.set(true);
  }
}
