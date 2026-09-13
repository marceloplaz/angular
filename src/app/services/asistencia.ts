import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/asistencia`;

  // Permitimos que usuarioId sea opcional o acepte null
  obtenerReporteRango(
    usuarioId: number | null | undefined, 
    fechaInicio: string, 
    fechaFin: string
  ): Observable<any> {
    
    // Construimos los Query Params dinámicamente
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    // Solo adjuntamos usuario_id a la petición HTTP si tiene un valor válido
    if (usuarioId !== null && usuarioId !== undefined) {
      params = params.set('usuario_id', usuarioId.toString());
    }

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/reporte-rango`, { params, headers });
  }
}