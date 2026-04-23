import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);

  const rol = localStorage.getItem('usuario_rol'); // viene del login
  const rolesPermitidos = route.data['roles'] as Array<string>;

  if (rol && rolesPermitidos.includes(rol)) {
    return true;
  } else {
    router.navigate(['/unauthorized']); // crea un componente simple de "No autorizado"
    return false;
  }
};
