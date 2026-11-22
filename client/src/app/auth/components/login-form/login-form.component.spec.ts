import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let element: HTMLElement;

  const type = (id: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginFormComponent);
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
  });

  it('rejects an invalid email', () => {
    type('email', 'not-an-email');
    type('password', 'x');
    submit();

    expect(element.querySelector('#email-error')?.textContent).toContain('valid email');
  });

  it('emits the trimmed email and the untouched password; any password length is accepted', () => {
    const emitted = jasmine.createSpy('submitted');
    component.submitted.subscribe(emitted);

    type('email', ' ada@example.com ');
    type('password', ' x ');
    submit();

    expect(emitted).toHaveBeenCalledOnceWith({ email: 'ada@example.com', password: ' x ' });
  });

  it('uses the right autocomplete hints for a password manager', () => {
    expect(element.querySelector('#email')?.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#password')?.getAttribute('autocomplete')).toBe('current-password');
  });

  it('links to the forgot-password page', () => {
    const link = element.querySelector<HTMLAnchorElement>('a');
    expect(link?.textContent).toContain('Forgot password?');
    expect(link?.getAttribute('href')).toBe('/forgot-password');
  });

  it('toggles the password visibility', () => {
    const input = element.querySelector<HTMLInputElement>('#password')!;
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-controls="password"]')!;
    expect(input.type).toBe('password');

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

    type('email', 'ada@example.com');
    type('password', 'correct horse battery');
    submit();

    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeTrue();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('shows the error from the store and lets the user dismiss it', () => {
    const dismissed = jasmine.createSpy('dismissed');
    component.errorDismissed.subscribe(dismissed);
    fixture.componentRef.setInput('errorMessage', 'Incorrect email or password.');
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Incorrect email or password.');
    element.querySelector<HTMLButtonElement>('button[aria-label="Dismiss message"]')!.click();
    expect(dismissed).toHaveBeenCalled();
  });
});
