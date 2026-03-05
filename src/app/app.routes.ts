import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

// Componentes Principales
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';

// Componentes de Gestión
import { PersonalComponent } from './components/personal/personal';
// Cambia la línea 10 por esta:
import { NuevoPersonalComponent } from './components/personal/nuevo-personal/nuevo-personal';
import { TurnosComponent } from './components/turnos/turnos';
import { ServiciosComponent } from './components/servicios/servicios';
import { CategoriasComponent } from './components/categorias/categorias';
import { IncidenciasComponent } from './components/incidencias/incidencias';
import { VacacionesComponent } from './components/vacaciones/vacaciones';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      { path: 'personal', component: PersonalComponent },
      { path: 'personal/nuevo', component: NuevoPersonalComponent }, // Ruta más descriptiva
      { path: 'turnos', component: TurnosComponent },
      { path: 'servicios', component: ServiciosComponent },
      { path: 'categorias', component: CategoriasComponent },
      { path: 'incidencias', component: IncidenciasComponent },
      { path: 'vacaciones', component: VacacionesComponent },
      { path: '', redirectTo: 'personal', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];