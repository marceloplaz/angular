import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  // URL corregida para evitar el error 404 de /login/login
  private API_URL = 'http://localhost:8000/api/v1/auth';

  login(credentials: any) {
    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      tap(res => {
        // Usamos access_token porque es lo que envía tu backend Laravel
        if (res && res.access_token) { 
          localStorage.setItem('token', res.access_token);
          console.log('Token guardado con éxito');
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