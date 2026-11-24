import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { VerifyEmailPage } from './verify-email.page';

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VerifyEmailPage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'test-token' }) } } },
      ],
    });
  });

  it('verifies the token and shows confirmation', async () => {
    const fixture = TestBed.createComponent(VerifyEmailPage);
    await fixture.whenStable();
    const request = TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/auth/email-verification');
    expect(request.request.body).toEqual({ token: 'test-token' });
    request.flush(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Your email has been verified');
  });

  it('offers another email when the token is rejected', async () => {
    const fixture = TestBed.createComponent(VerifyEmailPage);
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/auth/email-verification').flush(
      { error: 'invalid_verification_token' }, { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('invalid or has expired');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/resend-verification');
  });
});
