import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResendVerificationPage } from './resend-verification.page';

describe('ResendVerificationPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResendVerificationPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('validates and sends a neutral resend request', async () => {
    const fixture = TestBed.createComponent(ResendVerificationPage);
    const page = fixture.componentInstance;
    page.resend();
    expect(page.form.controls.email.touched).toBeTrue();
    page.form.controls.email.setValue(' ada@example.com ');
    page.resend();
    const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/auth/email-verification/request');
    expect(request.request.body).toEqual({ email: 'ada@example.com' });
    request.flush(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('If an unverified account exists');
  });

  it('shows a retryable error when the request fails', () => {
    const fixture = TestBed.createComponent(ResendVerificationPage);
    const page = fixture.componentInstance;
    page.form.controls.email.setValue('ada@example.com');
    page.resend();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/auth/email-verification/request')
      .flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(page.sent()).toBeFalse();
    expect(page.error()).toContain('Please try again');
  });
});
