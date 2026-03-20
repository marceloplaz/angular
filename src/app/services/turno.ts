import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private http = inject(HttpClient);
  
  /**
   * IMPORTANTE: Usamos directamente la URL del environment.
   * Si tu environment ya tiene 'http://127.0.0.1:8000/api/v1', 
   * NO le sumes otro '/api/v1' aquí.
   */
  private apiUrl = environment.apiUrl; 

  // --- GESTIÓN DE CONFIGURACIÓN (Calendario, Meses, Semanas) ---

  /**
   * Obtiene la configuración de años, meses y semanas.
   */
  getConfiguracionCalendario(): Observable<any> {
    return this.http.get(`${this.apiUrl}/calendario/configuracion`);
  }

  /**
   * Obtiene la lista de servicios (Medicina, Enfermería, etc.)
   */
  getServicios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios`);
  }

  // --- ASIGNACIÓN DE TURNOS ---

  /**
   * Registra un nuevo turno asignado a un médico.
   */
  asignarTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados`, data);
  }

  /**
   * Obtiene los médicos y sus turnos agrupados por jerarquía.
   * Esto es lo que llena las filas de tu tabla.
   */
  getEquipoPorJerarquia(servicioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/turnos-asignados/servicio/${servicioId}/equipo`);
  }

  /**
   * Permite intercambiar turnos entre dos registros.
   */
  intercambiarTurnos(asignacionId1: number, asignacionId2: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/intercambiar`, {
      asignacion_id_1: asignacionId1,
      asignacion_id_2: asignacionId2
    });
  }

  // --- REPORTES Y CONSULTAS ---

  /**
   * Reporte de horas semanales.
   */
  getReporteSemanal(semanaId: number, usuarioId?: number): Observable<any> {
    const path = usuarioId 
        ? `turnos-asignados/reporte-semanal/${semanaId}/${usuarioId}`
        : `turnos-asignados/reporte-semanal/${semanaId}`;
    return this.http.get(`${this.apiUrl}/${path}`);
  }

  /**
   * Turnos asignados al usuario actual (jugadordeunbit).
   */
  getMisTurnos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/turnos-asignados/mis-turnos`);
  }

  // --- CRUD DE TURNOS BASE ---

  getTurnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/turnos`);
  }

  crearTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos`, data);
  }
}