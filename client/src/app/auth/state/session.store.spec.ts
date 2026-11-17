import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  const me = `${environment.apiUrl}/auth/me`;
  const user = { id: 1, firstName: 'Ada', lastName: 'Lovelace', nickname: '', email: 'ada@example.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => http.verify());

  it('restores a signed-in user from the server once, and shares one request', () => {
    const results: boolean[] = [];
    store.restore().subscribe(value => results.push(value));
    store.restore().subscribe(value => results.push(value));
    http.expectOne(me).flush(user);

    expect(results).toEqual([true, true]);
    expect(store.user()).toEqual(user);

    store.restore().subscribe(value => results.push(value));
    expect(results).toEqual([true, true, true]);
  });

  it('is signed out when the server says so, and does not ask again', () => {
    let result: boolean | undefined;
    store.restore().subscribe(value => (result = value));
    http.expectOne(me).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeFalse();
    expect(store.isAuthenticated()).toBeFalse();
    store.restore().subscribe();
  });

  it('does not ask the server after a login', () => {
    store.setUser(user);
    let result: boolean | undefined;
    store.restore().subscribe(value => (result = value));
    expect(result).toBeTrue();
  });

  it('logs out on the server, forgets the user and goes to the login page', () => {
    store.setUser(user);
    store.logout();
    const request = http.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    request.flush(null);

    expect(store.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('signs out locally even if the logout request fails', () => {
    store.setUser(user);
    store.logout();
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
