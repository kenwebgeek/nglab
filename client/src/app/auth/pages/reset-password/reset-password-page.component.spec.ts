import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ResetPasswordPageComponent } from './reset-password-page.component';
import { SessionStore } from '../../state/session.store';

describe('ResetPasswordPageComponent', () => {
  let fixture: ComponentFixture<ResetPasswordPageComponent>;
  let component: ResetPasswordPageComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'reset-token' }) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResetPasswordPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('submits a valid new password with the token', () => {
    const clearSession = spyOn(TestBed.inject(SessionStore), 'clear').and.callThrough();
    component.form.setValue({
      newPassword: 'NewPassword2!',
      confirmPassword: 'NewPassword2!',
    });
    component.resetPassword();
    const request = http.expectOne('http://localhost:3000/auth/password-reset');
    expect(request.request.body).toEqual({
      token: 'reset-token',
      newPassword: 'NewPassword2!',
    });
    request.flush(null);
    fixture.detectChanges();

    expect(component.resetComplete()).toBeTrue();
    expect(clearSession).toHaveBeenCalled();
    expect(component.form.getRawValue()).toEqual({ newPassword: '', confirmPassword: '' });
    expect(fixture.nativeElement.textContent).toContain('Your password was reset');
  });

  it('rejects weak or mismatched passwords without a request', () => {
    component.form.setValue({
      newPassword: 'short',
      confirmPassword: 'different',
    });
    component.resetPassword();

    http.expectNone('http://localhost:3000/auth/password-reset');
    expect(component.form.touched).toBeTrue();
  });

  it('shows an invalid-link message when the token is rejected', () => {
    component.form.setValue({
      newPassword: 'NewPassword2!',
      confirmPassword: 'NewPassword2!',
    });
    component.resetPassword();
    http.expectOne('http://localhost:3000/auth/password-reset').flush(
      { error: 'invalid_reset_token' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.resetComplete()).toBeFalse();
    expect(component.error()).toContain('invalid or has expired');
  });

  it('shows a retryable error when the server is unavailable', () => {
    component.form.setValue({ newPassword: 'NewPassword2!', confirmPassword: 'NewPassword2!' });
    component.resetPassword();
    http.expectOne('http://localhost:3000/auth/password-reset').flush(
      {},
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(component.resetComplete()).toBeFalse();
    expect(component.error()).toBe('Unable to reset your password. Please try again.');
  });
});
