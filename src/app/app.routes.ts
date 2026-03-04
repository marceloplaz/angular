import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login'; 
import { DashboardComponent } from './components/dashboard/dashboard'; 
import { PersonalComponent } from './components/personal/personal'; 
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      // Al navegar a /dashboard/personal, se activa este componente
      { path: 'personal', component: PersonalComponent } 
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' } // Comodín para rutas no encontradas
];