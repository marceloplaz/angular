import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

// --- NUEVAS IMPORTACIONES PARA PRIMENG V18 ---
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara'; 
// ---------------------------------------------

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),
    // --- CONFIGURACIÓN DE PRIMENG ---
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false, // Desactiva el modo oscuro si no lo usas
          cssLayer: false          // Ayuda a que los estilos carguen sin conflictos de cascada
        }
      }
    })
    // --------------------------------
  ]
};