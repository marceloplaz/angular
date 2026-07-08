import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  // Apuntando exactamente al prefijo unificado v1 de tus rutas en Laravel
  private apiUrl = 'http://localhost:8000/api/v1/gestion-accesos'; 

  constructor(private http: HttpClient) { }

  /**
   * Carga los catálogos base (Roles, Servicios y Permisos)
   */
  getDatosIniciales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/inicializar`);
  }

  /**
   * Busca empleados de forma predictiva por nombre o correo electrónico
   */
  buscarEmpleado(termino: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/buscar-empleado?q=${termino}`);
  }

  /**
   * Persiste la matriz cruzada de asignación en la base de datos
   */
  guardarMatriz(payload: { user_id: number; role_id: number; servicios_ids: number[]; permisos_ids: number[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/guardar-matriz`, payload);
  }
}