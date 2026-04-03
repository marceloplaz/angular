import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // Importante
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; // Tu interceptor
import { provideAnimations } from '@angular/platform-browser/animations'; // <--- AGREGAR
import { provideToastr } from 'ngx-toastr'; // <--- AGREGAR

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]) // <--- ACTIVA EL INTERCEPTOR AQUÍ
    ),
    provideAnimations(), // <--- NECESARIO PARA TOASTR Y MODALES
    provideToastr({      // <--- CONFIGURACIÓN GLOBAL DE ALERTAS
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    })
  ]
};