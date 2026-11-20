import { Routes } from '@angular/router';
import { FormComponent, playLeaveAnimation } from './pages/form/form.component';
import { ListComponent } from './pages/list/list.component';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    component: ListComponent,
    // The form renders as an overlay on top of the list
    children: [
      { path: 'manage', component: FormComponent, canDeactivate: [playLeaveAnimation] },
    ],
  },
];
