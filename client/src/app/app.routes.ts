import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './auth/layout/auth-layout.component';
import { ShellLayoutComponent } from './shell/shell-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
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
