import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';

describe('ForgotPasswordPageComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordPageComponent>;
  let component: ForgotPasswordPageComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('validates the email and requests a reset', () => {
    component.requestReset();
    http.expectNone('http://localhost:3000/auth/password-reset/request');
    expect(component.form.controls.email.touched).toBeTrue();

    component.form.controls.email.setValue(' ada@example.com ');
    component.requestReset();
    const request = http.expectOne('http://localhost:3000/auth/password-reset/request');
    expect(request.request.body).toEqual({ email: 'ada@example.com' });
    request.flush(null);
    fixture.detectChanges();

    expect(component.sent()).toBeTrue();
    expect(component.submitting()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('If an account exists for that email');
  });

  it('shows a generic error when the request fails', () => {
    component.form.controls.email.setValue('ada@example.com');
    component.requestReset();
    http.expectOne('http://localhost:3000/auth/password-reset/request').flush(
      {},
      { status: 500, statusText: 'Server Error' },
    );

    expect(component.sent()).toBeFalse();
    expect(component.error()).toBe('Unable to request a password reset. Please try again.');
  });
});
