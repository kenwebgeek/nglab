import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.interface';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);

  baseApi = 'http://localhost:3000';

  // POST data
  addUser(user: User) {
    return this.http
      .post<User>(`${this.baseApi}/users`, user)
      .pipe(
        tap((data: User) => data),
        catchError(err => throwError(() => err))
      );
  }

  // DELETE data
  deleteUserData(id: any) {
    return this.http
      .delete<User>(`${this.baseApi}/users/${id}`)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }

  // GET data
  getUsers(): Observable<User[]> {
    return this.http
      .get<User[]>(`${this.baseApi}/users`)
      .pipe(
        tap((data: User[]) => data),
        catchError(err => throwError(() => err))
      );
  }

  // PUT Data
  updateUser(id: number, user: User) {
    return this.http
      .put<User>(`${this.baseApi}/users/${id}`, user)
      .pipe(
        catchError(err => throwError(() => err))
      );
  }
}
