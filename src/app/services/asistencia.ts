import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface ParametrosBusqueda {
  ci?: string;
  usuario_id?: number;
  fecha_inicio: string;
  fecha_fin: string;
  page?: number;
  per_page?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/asistencia`;
  private categoriaUrl = `${environment.apiUrl}/categorias`;

  obtenerReporteRango(params: ParametrosBusqueda): Observable<any> {
    let httpParams = new HttpParams()
      .set('fecha_inicio', params.fecha_inicio)
      .set('fecha_fin', params.fecha_fin)
      .set('page', (params.page || 1).toString())
      .set('per_page', (params.per_page || 15).toString());

    if (params.ci) {
      httpParams = httpParams.set('ci', params.ci);
    }
    if (params.usuario_id) {
      httpParams = httpParams.set('usuario_id', params.usuario_id.toString());
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/reporte-rango`, { params: httpParams, headers });
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