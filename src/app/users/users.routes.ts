import { Routes } from '@angular/router';
import { FormComponent } from './pages/form/form.component';
import { ListComponent } from './pages/list/list.component';

export const USERS_ROUTES: Routes = [
  { path: '', component: ListComponent },
  {
    path: 'manage',
    children: [
      { path: '', component: FormComponent },
      { path: ':id', component: FormComponent },
    ],
  },
];
