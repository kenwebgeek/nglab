import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UserFormComponent } from './user-form.component';

describe('UserFormComponent', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open as a modal dialog', () => {
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
  });

  it('initializes the admin checkbox for a selected user and submits the edited role', () => {
    fixture.componentRef.setInput('editing', true);
    fixture.componentRef.setInput('selectedUser', {
      id: 2, firstName: 'Ada', lastName: 'Lovelace', nickname: '', email: 'ada@example.com', admin: true,
    });
    fixture.detectChanges();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName=admin]');
    expect(checkbox.checked).toBeTrue();
    const submitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(submitted);
    checkbox.click();
    component.emitAction();
    expect(submitted).toHaveBeenCalledWith(jasmine.objectContaining({ id: 2, admin: false }));
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
  });

  it('defaults the admin checkbox to unchecked for new users', () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName=admin]');
    expect(checkbox.checked).toBeFalse();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
  });

  it('submits an optional valid password only for an existing non-admin user', async () => {
    fixture.componentRef.setInput('editing', true);
    fixture.componentRef.setInput('selectedUser', {
      id: 2, firstName: 'Ada', lastName: 'Lovelace', nickname: '', email: 'ada@example.com', admin: false,
    });
    await fixture.whenStable();
    const submitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(submitted);
    component.emitAction();
    expect(submitted.calls.mostRecent().args[0].newPassword).toBeUndefined();
    component.userForm.get('newPassword')!.setValue('short');
    component.emitAction();
    expect(submitted).toHaveBeenCalledTimes(1);
    component.userForm.get('newPassword')!.setValue('ValidPassword1!');
    component.emitAction();
    expect(submitted.calls.mostRecent().args[0].newPassword).toBe('ValidPassword1!');
    (fixture.nativeElement.querySelector('input[formControlName=admin]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
    expect(component.userForm.get('newPassword')!.value).toBe('');
  });

  it('does not display a password field for the signed-in admin', async () => {
    fixture.componentRef.setInput('editing', true);
    fixture.componentRef.setInput('showAdmin', false);
    fixture.componentRef.setInput('selectedUser', {
      id: 1, firstName: 'Ada', lastName: 'Lovelace', nickname: '', email: 'ada@example.com', admin: true,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input[type=password]')).toBeNull();
  });

  it('should play the exit animation before resolving animateOut', async () => {
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    let resolved = false;

    const leaving = component.animateOut().then(() => resolved = true);
    fixture.detectChanges();

    expect(component.closing()).toBeTrue();
    expect(dialog.classList).toContain('animate-dialog-out');
    expect(resolved).toBeFalse();

    dialog.dispatchEvent(new Event('animationend'));
    await leaving;
    expect(resolved).toBeTrue();
  });

  it('should emit cancelled from the close button, Cancel button, Esc and backdrop click', () => {
    const cancelled = jasmine.createSpy('cancelled');
    component.cancelled.subscribe(cancelled);
    const el: HTMLElement = fixture.nativeElement;
    const dialog = el.querySelector('dialog') as HTMLDialogElement;

    (el.querySelector('button[aria-label="Close dialog"]') as HTMLButtonElement).click();
    (Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.click();

    expect(cancelled).toHaveBeenCalledTimes(4);
  });
});
