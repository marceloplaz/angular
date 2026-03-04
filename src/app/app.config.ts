import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; // <--- Verifica que el archivo exista

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Esto es lo que permite que el token de la imagen image_bcc500.png se envíe
    provideHttpClient(
      withInterceptors([authInterceptor]) 
    )
  ]
};