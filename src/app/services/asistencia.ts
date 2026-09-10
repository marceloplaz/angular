import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
// Importa las interfaces que definimos para tipar la respuesta
import { AsistenciaResponse } from '../interfaces/asistencia'; 

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  // Usamos el environment de forma centralizada al igual que en tus áreas
  private apiUrl = `${environment.apiUrl}/asistencia/reporte-rango`;

  // GET: Obtiene el reporte de asistencia y permisos por rango de fechas
  obtenerReporteRango(usuarioId: number, fechaInicio: string, fechaFin: string): Observable<AsistenciaResponse> {
    const params = new HttpParams()
      .set('usuario_id', usuarioId.toString())
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http.get<AsistenciaResponse>(this.apiUrl, { params });
  }
}