import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login-page.component';
import { SignupPageComponent } from './pages/signup/signup-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password/reset-password-page.component';
import { guestGuard } from './guards/auth.guards';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupPageComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordPageComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordPageComponent },
];
