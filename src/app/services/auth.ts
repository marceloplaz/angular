import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  // URL base ajustada al prefijo "v1" y al grupo "auth" de tu api.php
  private API_URL = 'http://localhost:8000/api/v1/auth'; 

  login(credentials: any) {
    // La petición ahora irá a http://localhost:8000/api/v1/auth/login
    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        // Laravel Sanctum suele devolver 'access_token' o 'token'
        if (res && res.access_token) { 
          localStorage.setItem('token', res.access_token);
          console.log('Sesión iniciada correctamente en bd_proyecto_backend');
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}