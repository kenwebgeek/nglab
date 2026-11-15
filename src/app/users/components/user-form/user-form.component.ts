import { Component, ElementRef, afterNextRender, computed, effect, input, output, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../models/user.interface';
import { AlertsComponent } from '../../../shared/alerts/alerts.component';

@Component({
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    imports: [ReactiveFormsModule, AlertsComponent]
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly selectedUser = input<User | null>(null);
  // Set when saving fails, so the error shows inside the open dialog
  readonly errorMessage = input<string | null>(null);
  readonly action = output<{ value: User, action: string }>();
  readonly cancelled = output<void>();
  readonly closing = signal(false);
  private leaving?: Promise<void>;
  readonly actionButtonLabel = computed(() => this.selectedUser() ? 'Update' : 'Create');

  userForm: FormGroup;

  constructor() {
    this.userForm = this.fb.group({
      firstName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],
      nickname: [''],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      currentActivity: [''],
      id: [''],
    });

    afterNextRender(() => this.dialog().nativeElement.showModal());

    // The selected user can arrive after the form is created (e.g. a direct visit while users load)
    effect(() => {
      const selectedUser = this.selectedUser();
      if (selectedUser) {
        this.userForm.patchValue(selectedUser);
      }
    });
  }

  // Plays the exit animation; resolves once the dialog is ready to be removed
  animateOut(): Promise<void> {
    this.leaving ??= new Promise<void>(resolve => {
      const dialog = this.dialog().nativeElement;
      if (!dialog.open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        resolve();
        return;
      }
      // The timeout covers a missed animationend (e.g. a hidden tab)
      const timeout = setTimeout(resolve, 300);
      dialog.addEventListener('animationend', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.closing.set(true);
    });
    return this.leaving;
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

  emitAction() {
    this.action.emit({ value: this.userForm.value, action: this.actionButtonLabel() });
  }

  resetForm() {
    this.userForm.reset();
  }

  showError(name: 'firstName' | 'lastName' | 'email'): boolean {
    const control = this.userForm.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Get form controls to use for form validation
  get firstName() {
    return this.userForm.get('firstName');
  }

  get lastName() {
    return this.userForm.get('lastName');
  }

  get email() {
    return this.userForm.get('email');
  }

}
