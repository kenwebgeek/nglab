import { Routes } from '@angular/router';
import { SignupPageComponent } from './pages/signup/signup-page.component';

// `/login` joins these routes with the login feature
export const AUTH_ROUTES: Routes = [
  { path: 'signup', component: SignupPageComponent },
];
