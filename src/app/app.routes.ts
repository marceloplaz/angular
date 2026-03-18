import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

// Componentes Principales
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';

// Componentes de Gestión
import { PersonalComponent } from './components/personal/personal';
import { NuevoPersonalComponent } from './components/personal/nuevo-personal/nuevo-personal';
import { VerPersonalComponent } from './components/personal/ver-personal/ver-personal';
import { TurnosComponent } from './components/turnos/turnos';
import { ServiciosComponent } from './components/servicios/servicios';
// IMPORTA EL NUEVO COMPONENTE AQUÍ
import { GestionPersonalServicioComponent } from './components/servicios/gestion-personal-servicio/gestion-personal-servicio'; 

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
      { path: 'personal/nuevo', component: NuevoPersonalComponent },
      { path: 'personal/ver/:id', component: VerPersonalComponent }, 
      { path: 'turnos', component: TurnosComponent },
      
      // RUTAS DE SERVICIOS
      { path: 'servicios', component: ServiciosComponent },
      // Nueva ruta para la gestión de personal específica de un servicio
      { path: 'servicios/:id/asignar', component: GestionPersonalServicioComponent }, 
      
      { path: 'categorias', component: CategoriasComponent },
      { path: 'incidencias', component: IncidenciasComponent },
      { path: 'vacaciones', component: VacacionesComponent },
      { path: '', redirectTo: 'personal', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];