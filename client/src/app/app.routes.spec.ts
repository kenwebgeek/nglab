import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SessionStore } from './auth/state/session.store';

describe('password reset routing', () => {
  const signedInUser = {
    id: 1, firstName: 'Ada', lastName: 'Lovelace', nickname: '',
    email: 'ada@example.com', currentActivity: '', admin: false,
  };

  it('opens a reset link even when the browser is signed in', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    TestBed.inject(SessionStore).setUser(signedInUser);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/reset-password?token=reset-token');

    expect(TestBed.inject(Router).url).toBe('/reset-password?token=reset-token');
    expect(harness.routeNativeElement?.textContent).toContain('Choose a new password');
  });

  it('still redirects signed-in users away from login', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    });
    TestBed.inject(SessionStore).setUser(signedInUser);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/users');
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/users').flush([]);
  });
});
