import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login-page.component';
import { SignupPageComponent } from './pages/signup/signup-page.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'signup', component: SignupPageComponent },
];
