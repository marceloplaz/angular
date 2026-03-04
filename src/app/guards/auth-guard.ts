import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Aquí es donde jugadordeunbit debe validar el token o sesión
  const isAuthenticated = localStorage.getItem('token') !== null; 

  if (isAuthenticated) {
    return true;
  } else {
    // Si no está autenticado, lo mandamos al login (por eso no salías de ahí)
    router.navigate(['/login']);
    return false;
  }
};