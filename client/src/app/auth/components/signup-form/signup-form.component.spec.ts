import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupFormComponent } from './signup-form.component';

describe('SignupFormComponent', () => {
  let component: SignupFormComponent;
  let fixture: ComponentFixture<SignupFormComponent>;
  let element: HTMLElement;

  const type = (id: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fillValid = () => {
    type('email', 'ada@example.com');
    type('password', 'correct horse battery');
    type('firstName', 'Ada');
    type('lastName', 'Lovelace');
  };
  const submit = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SignupFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(SignupFormComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows required errors and emits nothing when submitted empty', () => {
    const emitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(emitted);

    submit();

    expect(emitted).not.toHaveBeenCalled();
    expect(element.querySelector('#email-error')?.textContent).toContain('Email is required');
    expect(element.querySelector('#password-error')?.textContent).toContain('Password is required');
    expect(element.querySelector('#firstName-error')?.textContent).toContain('First name is required');
    expect(element.querySelector('#lastName-error')?.textContent).toContain('Last name is required');
    expect(element.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not require a nickname', () => {
    const emitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(emitted);
    fillValid();
    submit();

    expect(emitted).toHaveBeenCalledOnceWith(jasmine.objectContaining({ nickname: '' }));
    expect(element.querySelector('#nickname-error')).toBeNull();
  });

  it('judges names after trimming, like the API', () => {
    fillValid();
    type('firstName', '   ');
    type('lastName', 'L ');
    submit();

    expect(element.querySelector('#firstName-error')?.textContent).toContain('First name is required');
    expect(element.querySelector('#lastName-error')?.textContent).toContain('at least 2 characters');
  });

  it('rejects names and a nickname over 100 characters', () => {
    fillValid();
    type('firstName', 'x'.repeat(101));
    type('nickname', 'x'.repeat(101));
    submit();

    expect(element.querySelector('#firstName-error')?.textContent).toContain('at most 100 characters');
    expect(element.querySelector('#nickname-error')?.textContent).toContain('at most 100 characters');
  });

  it('lists the fields in the design order', () => {
    const ids = Array.from(element.querySelectorAll('input')).map(input => input.id);
    expect(ids).toEqual(['email', 'password', 'firstName', 'lastName', 'nickname']);
  });

  it('rejects an invalid email and a short password', () => {
    type('email', 'not-an-email');
    type('password', 'short');
    submit();

    expect(element.querySelector('#email-error')?.textContent).toContain('valid email');
    expect(element.querySelector('#password-error')?.textContent).toContain('at least 8 characters');
  });

  it('emits the trimmed profile fields and the untouched password', () => {
    const emitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(emitted);

    type('email', '  ada@example.com ');
    type('password', ' correct horse ');
    type('firstName', ' Ada ');
    type('lastName', ' Lovelace ');
    type('nickname', ' Countess ');
    submit();

    expect(emitted).toHaveBeenCalledOnceWith({
      email: 'ada@example.com',
      password: ' correct horse ',
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: 'Countess',
    });
  });

  it('toggles the password visibility', () => {
    const input = element.querySelector<HTMLInputElement>('#password')!;
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-controls="password"]')!;
    expect(input.type).toBe('password');
    expect(toggle.textContent).toContain('Show');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.textContent).toContain('Hide');
  });

  it('disables submit while submitting and does not emit', () => {
    const emitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(emitted);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    fillValid();
    submit();

    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeTrue();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('shows the error from the store and lets the user dismiss it', () => {
    const dismissed = jasmine.createSpy('dismissed');
    component.errorDismissed.subscribe(dismissed);
    fixture.componentRef.setInput('errorMessage', 'An account with this email already exists.');
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('already exists');
    element.querySelector<HTMLButtonElement>('button[aria-label="Dismiss message"]')!.click();
    expect(dismissed).toHaveBeenCalled();
  });
});
