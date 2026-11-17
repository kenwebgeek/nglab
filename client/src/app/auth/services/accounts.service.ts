import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../users/models/user.interface';
import { SignupRequest } from '../models/signup-request.interface';

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  private readonly http = inject(HttpClient);

  baseApi = environment.apiUrl;

  // The API creates a user with credentials and returns the user, never the password or its hash
  createAccount(request: SignupRequest): Observable<User> {
    return this.http.post<User>(`${this.baseApi}/accounts`, request);
  }
}
