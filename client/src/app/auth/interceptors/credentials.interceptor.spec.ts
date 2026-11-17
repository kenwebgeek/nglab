import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionStore } from '../state/session.store';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let navigate: jasmine.Spy;
  let session: SessionStore;
  const user = { id: 1, firstName: 'Ada', lastName: 'Lovelace', nickname: '', email: 'ada@example.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([credentialsInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => controller.verify());

  it('sends credentials to the API only', () => {
    http.get(`${environment.apiUrl}/users`).subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/users`).request.withCredentials).toBeTrue();

    http.get('https://example.com/data').subscribe();
    expect(controller.expectOne('https://example.com/data').request.withCredentials).toBeFalse();
  });

  it('signs out and goes to the login page when the API says the session is gone', () => {
    session.setUser(user);
    http.get(`${environment.apiUrl}/users`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/users`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('leaves 401s from the auth endpoints to their callers', () => {
    session.setUser(user);
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(session.isAuthenticated()).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat other errors as a lost session', () => {
    session.setUser(user);
    http.get(`${environment.apiUrl}/users`).subscribe({ error: () => undefined });
    controller.expectOne(`${environment.apiUrl}/users`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(session.isAuthenticated()).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });
});
