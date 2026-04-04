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
import { NovedadComponent } from './components/novedad/novedad';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard],
    children: [
      // SECCIÓN PERSONAL
      {
        path: 'personal',
  children: [
    { path: '', component: PersonalComponent },
    { path: 'nuevo', component: NuevoPersonalComponent },
    { path: 'editar/:id', component: NuevoPersonalComponent }, // <-- Añade esta línea
    { path: 'ver/:id', component: VerPersonalComponent },
        ]
      },

      // SECCIÓN SERVICIOS
      { path: 'servicios', component: ServiciosComponent },
      { path: 'servicios/:id/asignar', component: GestionPersonalServicioComponent }, 
      
      // OTRAS SECCIONES
      { path: 'turnos', component: TurnosComponent },
      { path: 'categorias', component: CategoriasComponent },
      { path: 'incidencias', component: IncidenciasComponent },
      { path: 'vacaciones', component: VacacionesComponent },
      { path: 'novedades', component: NovedadComponent },
      
      // REDIRECCIÓN POR DEFECTO DENTRO DEL DASHBOARD
      { path: '', redirectTo: 'personal', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];