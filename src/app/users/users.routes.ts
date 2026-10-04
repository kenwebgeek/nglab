import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { FormComponent } from './pages/form/form.component';
import { ListComponent } from './pages/list/list.component';
import { UserEffects } from './state/user.effects';
import { userReducer } from './state/user.reducers';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    providers: [provideState('userState', userReducer), provideEffects(UserEffects)],
    children: [
      { path: '', component: ListComponent },
      {
        path: 'manage',
        children: [
          { path: '', component: FormComponent },
          { path: ':id', component: FormComponent },
        ],
      },
    ],
  },
];
