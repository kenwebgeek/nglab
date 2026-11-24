import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../state/auth.store';
import { SignupPageComponent } from './signup-page.component';

describe('SignupPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the heading, the form and a link to log in', () => {
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Create your account');
    expect(element.textContent).toContain('Enter your details to create your account.');
    expect(element.querySelector('app-signup-form')).toBeTruthy();
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/resend-verification', '/login']);
  });

  it('hands the submitted details to the store and clears a stale error on entry', () => {
    const store = TestBed.inject(AuthStore);
    const dismiss = spyOn(store, 'dismissError').and.callThrough();
    const signUp = spyOn(store, 'signUp');
    const fixture = TestBed.createComponent(SignupPageComponent);
    fixture.detectChanges();
    expect(dismiss).toHaveBeenCalled();

    const element: HTMLElement = fixture.nativeElement;
    const email = element.querySelector<HTMLInputElement>('#email')!;
    const password = element.querySelector<HTMLInputElement>('#password')!;
    email.value = 'ada@example.com';
    email.dispatchEvent(new Event('input'));
    password.value = 'correct horse battery';
    password.dispatchEvent(new Event('input'));
    for (const [id, value] of [['firstName', 'Ada'], ['lastName', 'Lovelace']]) {
      const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'correct horse battery',
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: '',
    });
  });
});
