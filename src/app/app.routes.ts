import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { Dashboard } from './pages/dashboard/dashboard';
import { FeedbackPage } from './pages/feedback/feedback';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Home } from './pages/home/home';
import { LimeBoost } from './pages/lime-boost/lime-boost';
import { Login } from './pages/login/login';
import { Logout } from './pages/logout/logout';
import { ProspectPage } from './pages/prospect/prospect';
import { SignUp } from './pages/sign-up/sign-up';

export const routes: Routes = [
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'feedback', component: FeedbackPage, canActivate: [authGuard] },
  { path: 'prospect', component: ProspectPage, canActivate: [authGuard] },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'home', component: Home },
  { path: 'lime-boost', component: LimeBoost },
  { path: 'login', component: Login },
  { path: 'logout', component: Logout },
  { path: 'register', component: SignUp },
  { path: 'sign-in', redirectTo: 'login', pathMatch: 'full' },
  { path: 'sign-up', redirectTo: 'register', pathMatch: 'full' },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'register', pathMatch: 'full' },
];
