import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../users/models/user.interface';
import { LoginRequest } from '../models/login-request.interface';

// The session itself is an HttpOnly cookie the browser keeps; the app never sees the token
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  baseApi = environment.apiUrl;

  login(request: LoginRequest): Observable<User> {
    return this.http.post<User>(`${this.baseApi}/auth/login`, request);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseApi}/auth/logout`, null);
  }

  // Fails with a 401 when nobody is signed in
  currentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseApi}/auth/me`);
  }
}
