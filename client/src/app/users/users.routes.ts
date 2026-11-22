import { Routes } from '@angular/router';
import { FormComponent, playLeaveAnimation } from './pages/form/form.component';
import { ListComponent } from './pages/list/list.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../auth/state/session.store';

const adminGuard = () =>
  inject(SessionStore).user()?.admin === true || inject(Router).createUrlTree(['/users']);

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: ListComponent,
    // The form renders as an overlay on top of the list
    children: [
      { path: 'manage', component: FormComponent, canActivate: [adminGuard], canDeactivate: [playLeaveAnimation] },
      { path: 'manage/:id', component: FormComponent, canActivate: [adminGuard], canDeactivate: [playLeaveAnimation] },
    ],
  },
];
