import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

// 🌟 IMPORTACIONES PARA EL IDIOMA ESPAÑOL EN ANGULAR
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';

// Registramos los datos de localización en español
registerLocaleData(localeEs);

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
    
    // 🌟 PROVEEDOR PARA PIPES DE ANGULAR (Arregla la fecha del Modal a español)
    { provide: LOCALE_ID, useValue: 'es-ES' },

    // --- CONFIGURACIÓN DE PRIMENG ---
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false,
          cssLayer: false
        }
      },
      // 🌟 TRADUCCIÓN GLOBAL PARA COMPONENTES DE PRIMENG (Datepicker/Calendar)
      translation: {
        dayNames: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
        dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
        dayNamesMin: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"], // Cambia el Su, Mo, Tu...
        monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
        monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
        today: 'Hoy',
        clear: 'Limpiar',
        accept: 'Aceptar',
        reject: 'Cancelar'
      }
    })
    // --------------------------------
  ]
};