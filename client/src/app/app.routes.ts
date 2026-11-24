import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guards';
import { AuthLayoutComponent } from './auth/layout/auth-layout.component';
import { ShellLayoutComponent } from './shell/shell-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'account',
        loadComponent: () => import('./account/account.component').then((m) => m.AccountComponent),
      },
      {
        path: 'users',
        loadChildren: () => import('./users/users.routes').then((m) => m.USERS_ROUTES),
      },
    ],
  },
  {
    path: '',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  { path: '**', redirectTo: 'users' },
];
