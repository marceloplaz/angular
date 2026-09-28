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
  private categoriaUrl = `${environment.apiUrl}/categorias`; // Endpoint de categorías

  obtenerReporteRango(
    busqueda: { ci?: string; usuarioId?: number }, 
    fechaInicio: string, 
    fechaFin: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    if (busqueda?.ci) {
      params = params.set('ci', busqueda.ci);
    }
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

  obtenerMatrizAsistencia(fechaInicio: string, fechaFin: string, categoriaId?: any): Observable<any> {
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    if (categoriaId !== '' && categoriaId !== null && categoriaId !== undefined) {
      params = params.set('categoria_id', categoriaId.toString());
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/matriz`, { params, headers });
  }
  descargarMatrizPdf(fechaInicio: string, fechaFin: string, categoriaId: any): Observable<Blob> {
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    if (categoriaId !== '' && categoriaId !== null && categoriaId !== undefined) {
      params = params.set('categoria_id', categoriaId.toString());
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/pdf',
      'X-Requested-With': 'XMLHttpRequest'
    });

    return this.http.get(`${this.apiUrl}/matriz-pdf`, { 
      params, 
      headers, 
      responseType: 'blob' 
    });
  }

 
  obtenerCategorias(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.http.get<any>(this.categoriaUrl, { headers });
  }
}