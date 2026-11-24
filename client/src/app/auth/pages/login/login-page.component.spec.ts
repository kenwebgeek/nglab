import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../state/auth.store';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the heading, the form and a link to sign up', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Welcome back');
    expect(element.textContent).toContain('Log in to manage your workspace and users.');
    expect(element.querySelector('app-login-form')).toBeTruthy();
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/forgot-password', '/signup']);
  });

  it('shows the sign-up notice and lets the user dismiss it', () => {
    const store = TestBed.inject(AuthStore);
    spyOn(store, 'notice').and.returnValue('Account created. Log in to continue.');
    const dismiss = spyOn(store, 'dismissNotice');
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Account created');
    element.querySelector<HTMLButtonElement>('button[aria-label="Dismiss message"]')!.click();
    expect(dismiss).toHaveBeenCalled();
  });

  it('hands the submitted credentials to the store and clears a stale error on entry', () => {
    const store = TestBed.inject(AuthStore);
    const dismiss = spyOn(store, 'dismissError').and.callThrough();
    const login = spyOn(store, 'login');
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    expect(dismiss).toHaveBeenCalled();

    const element: HTMLElement = fixture.nativeElement;
    for (const [id, value] of [['email', 'ada@example.com'], ['password', 'correct horse battery']]) {
      const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(login).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse battery' });
  });
});
