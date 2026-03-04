import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login'; // SIN .ts
import { DashboardComponent } from './components/dashboard/dashboard'; // SIN .ts
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard] 
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];