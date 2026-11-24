import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';
import { SessionStore } from './session.store';

describe('AuthStore', () => {
  let store: AuthStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  const url = `${environment.apiUrl}/accounts`;
  const credentials = {
    email: 'ada@example.com',
    password: 'correct horse battery',
    firstName: 'Ada',
    lastName: 'Lovelace',
    nickname: 'Countess',
  };
  const created = { id: 1, email: credentials.email, firstName: 'Ada', lastName: 'Lovelace', nickname: 'Countess' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  it('posts the sign-up request, then goes to the login page with a notice', () => {
    store.signUp(credentials);
    expect(store.submitting()).toBeTrue();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    request.flush(created);

    expect(store.submitting()).toBeFalse();
    expect(store.error()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(store.notice()).toContain('Check your email to verify your address');
  });

  it('ignores a second submit while one is in flight', () => {
    store.signUp(credentials);
    store.signUp(credentials);
    const requests = http.match(url);
    expect(requests.length).toBe(1);
    requests[0].flush(created);
  });

  it('explains a duplicate email and stays on the page', () => {
    store.signUp(credentials);
    http.expectOne(url).flush({ error: 'email_taken' }, { status: 409, statusText: 'Conflict' });

    expect(store.error()).toBe('An account with this email already exists.');
    expect(store.submitting()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports throttling and other failures', () => {
    store.signUp(credentials);
    http.expectOne(url).flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(store.error()).toBe('Too many attempts. Please try again later.');

    store.signUp(credentials);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBe('Unable to create the account. Please try again.');
  });

  it('clears the previous error when a new attempt starts and when dismissed', () => {
    store.signUp(credentials);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.error()).not.toBeNull();

    store.signUp(credentials);
    expect(store.error()).toBeNull();
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server Error' });

    store.dismissError();
    expect(store.error()).toBeNull();
  });

  describe('login', () => {
    const loginUrl = `${environment.apiUrl}/auth/login`;
    const login = { email: 'ada@example.com', password: 'correct horse battery' };

    it('signs in, remembers the user and goes to the users list', () => {
      const session = TestBed.inject(SessionStore);
      store.signUp(credentials);
      http.expectOne(url).flush(created);
      expect(store.notice()).not.toBeNull();
      navigate.calls.reset();

      store.login(login);
      expect(store.submitting()).toBeTrue();
      const request = http.expectOne(loginUrl);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(login);
      request.flush(created);

      expect(store.submitting()).toBeFalse();
      expect(store.notice()).toBeNull();
      expect(session.user()).toEqual(created);
      expect(navigate).toHaveBeenCalledWith(['/users']);
    });

    it('says the credentials were wrong without saying which one', () => {
      const session = TestBed.inject(SessionStore);
      store.login(login);
      http.expectOne(loginUrl).flush({ error: 'invalid_credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(store.error()).toBe('Incorrect email or password.');
      expect(session.isAuthenticated()).toBeFalse();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('explains that an unverified account needs verification', () => {
      store.login(login);
      http.expectOne(loginUrl).flush(
        { error: 'email_unverified' }, { status: 403, statusText: 'Forbidden' },
      );
      expect(store.error()).toContain('Verify your email address');
      expect(TestBed.inject(SessionStore).isAuthenticated()).toBeFalse();
    });

    it('reports throttling and other failures, and ignores a second submit while one is in flight', () => {
      store.login(login);
      store.login(login);
      http.match(loginUrl)[0].flush({}, { status: 429, statusText: 'Too Many Requests' });
      expect(store.error()).toBe('Too many attempts. Please try again later.');

      store.login(login);
      http.expectOne(loginUrl).flush({}, { status: 500, statusText: 'Server Error' });
      expect(store.error()).toBe('Unable to log in. Please try again.');
    });
  });
});
