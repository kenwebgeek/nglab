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

  it('should patch the form and switch to Update when a user is selected later', () => {
    expect(component.actionButtonLabel()).toBe('Create');

    fixture.componentRef.setInput('selectedUser', {
      id: 1, firstName: 'Tony', lastName: 'Stark', nickname: 'Iron Man', email: 'tony@avengers.com',
    });
    fixture.detectChanges();

    expect(component.actionButtonLabel()).toBe('Update');
    expect(component.userForm.value.firstName).toBe('Tony');
  });

  it('should open as a modal dialog', () => {
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
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
