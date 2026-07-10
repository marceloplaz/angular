import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private API_URL = 'http://localhost:8000/api/v1/auth'; 

  login(credentials: any) {
    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        if (res && res.access_token) { 
          // 1. Guardamos el token de Sanctum para las cabeceras HTTP
          localStorage.setItem('token', res.access_token);
          
          // 2. Extraemos los campos del objeto 'user' que configuramos en el UserResource
          if (res.user) {
            localStorage.setItem('user_id', res.user.id);
            localStorage.setItem('nombre_usuario', res.user.nombre_usuario);
            localStorage.setItem('rol_nombre', res.user.rol_nombre);       
            localStorage.setItem('user_categorias', JSON.stringify(res.user.categorias || []));
            localStorage.setItem('user_servicios', JSON.stringify(res.user.servicios || []));
          }
          
          console.log('Sesión iniciada correctamente con perfil de alcance optimizado.');
        }
      })
    );
  }

  // Comprueba si el usuario tiene inmunidad total en el hospital (Administración Central)
  esAdminAbsoluto(): boolean {
    const rol = localStorage.getItem('rol_nombre');
    return rol === 'super_admin' || rol === 'admin';
  }

  getCategoriasPermitidas(): number[] {
  const categoriasRaw = localStorage.getItem('user_categorias');
  return categoriasRaw ? JSON.parse(categoriasRaw) : [];
}

  // Devuelve el array real de IDs de servicios médicos que este usuario puede gestionar
  getServiciosPermitidos(): number[] {
    const serviciosRaw = localStorage.getItem('user_servicios');
    return serviciosRaw ? JSON.parse(serviciosRaw) : [];
  }

  // Verifica puntualmente si el usuario autenticado tiene jurisdicción sobre un ID de servicio
  tieneAccesoAServicio(servicioId: number): boolean {
    if (this.esAdminAbsoluto()) return true; // El administrador tiene pase libre a todo el hospital
    return this.getServiciosPermitidos().includes(servicioId);
  }

  logout() {
    // Limpieza total para que no queden residuos de sesiones previas al cambiar de cuenta
    localStorage.clear();
  }

  getToken() {
    return localStorage.getItem('token');
  }
 
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}