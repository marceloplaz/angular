import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';

// Componentes
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { PersonalComponent } from './components/personal/personal';
import { NuevoPersonalComponent } from './components/personal/nuevo-personal/nuevo-personal';
import { VerPersonalComponent } from './components/personal/ver-personal/ver-personal';
import { TurnosComponent } from './components/turnos/turnos';
import { ServiciosComponent } from './components/servicios/servicios';
import { GestionPersonalServicioComponent } from './components/servicios/gestion-personal-servicio/gestion-personal-servicio';
import { CategoriasComponent } from './components/categorias/categorias';
import { IncidenciasComponent } from './components/incidencias/incidencias';
import { VacacionesComponent } from './components/vacaciones/vacaciones';
import { NovedadComponent } from './components/novedad/novedad';
import { ConfiguracionSistemaComponent } from './components/configuracion-sistema/configuracion-sistema';

const ROLES_ADMIN_FULL = ['super_admin', 'admin', 'admin_jefe_medico', 'admin_jefa_enfermeras', 'admin_jefa_servicios_generales'];
const ROLES_JEFATURAS = [...ROLES_ADMIN_FULL, 'jefe_medico_servicio', 'jefa_enfermeras_servicio', 'jefe_servicio'];


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
        canActivate: [roleGuard],
        data: { roles: [...ROLES_JEFATURAS] },
        children: [
          { path: '', component: PersonalComponent },
          { path: 'nuevo', component: NuevoPersonalComponent },
          { path: 'editar/:id', component: NuevoPersonalComponent },
          { path: 'ver/:id', component: VerPersonalComponent },
        ]
      },

      // SECCIÓN SERVICIOS
      {
  path: 'servicios',
  component: ServiciosComponent,
  canActivate: [roleGuard],
  data: { roles: [...ROLES_JEFATURAS] } // Limpio, ya contiene a la jefa de enfermeras
},
      {
        path: 'servicios/:id/asignar',
        component: GestionPersonalServicioComponent,
        canActivate: [roleGuard],
        data: { roles: ROLES_ADMIN_FULL }
      },

     { 
  path: 'turnos', 
  component: TurnosComponent, 
  canActivate: [roleGuard], 
  data: { roles: [...ROLES_JEFATURAS] } 
},
    { 
  path: 'categorias', 
  component: CategoriasComponent, 
  canActivate: [roleGuard], 
  data: { roles: [...ROLES_JEFATURAS] } 
},
 { 
  path: 'incidencias', 
  component: IncidenciasComponent, 
  canActivate: [roleGuard], 
  data: { roles: [...ROLES_JEFATURAS, 'responsable_tecnico'] } 
},
      { 
        path: 'vacaciones', 
        component: VacacionesComponent, 
        canActivate: [roleGuard], 
        data: { roles: [...ROLES_JEFATURAS,'jefa_enfermeras_servicio'] } 
      },
      { 
        path: 'novedades', 
        component: NovedadComponent, 
        canActivate: [roleGuard], 
        data: { roles: [...ROLES_JEFATURAS, 'jefa_enfermeras_servicio'] } 
      },
      { 
        path: 'configuracion-sistema', 
        component: ConfiguracionSistemaComponent, 
        canActivate: [roleGuard], 
        data: { roles: ['super_admin', 'admin'] } 
      },

    
    ]
  },
  { path: 'unauthorized', component: LoginComponent }, // Idealmente un componente 403
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];