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

  obtenerReporteRango(
    busqueda: { ci?: string; usuarioId?: number }, 
    fechaInicio: string, 
    fechaFin: string
  ): Observable<any> {
    
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    // Adjuntar 'ci' si fue ingresado
    if (busqueda?.ci) {
      params = params.set('ci', busqueda.ci);
    }

    // Adjuntar 'usuario_id' si fue ingresado como ID
    if (busqueda?.usuarioId) {
      params = params.set('usuario_id', busqueda.usuarioId.toString());
    }

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/reporte-rango`, { params, headers });
  }
}