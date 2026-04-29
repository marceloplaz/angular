import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Ajusta la ruta según tu proyecto
import { NovedadListar } from '../interfaces/novedad';

@Injectable({
  providedIn: 'root'
})
export class NovedadService {
  // En Angular 21, inyectamos HttpClient directamente como una propiedad
  private readonly _http = inject(HttpClient);

  private readonly _apiUrl = `${environment.apiUrl}/novedades`;
  

  getNovedades(): Observable<NovedadListar[]> {
    return this._http.get<NovedadListar[]>(this._apiUrl);
  }

  /**
   * Registra una novedad laboral o permuta de turnos.
   * @param datos Objeto con id_origen, id_destino (opcional), tipo_novedad y observacion.
   */
 registrarNovedad(datos: any): Observable<any> {
    // Debe ser /permutar-turnos para que coincida con tu api.php
    return this._http.post(`${this._apiUrl}/permutar-turnos`, datos); 
}
permutarTurnos(datos: any): Observable<any> {
    return this._http.post(`${this._apiUrl}/permutar-turnos`, datos);
  }

  confirmarDevolucion(id: number | string): Observable<any> {
  // Esto genera: api/v1/novedades/37/confirmar-devolucion
  return this._http.post(`${this._apiUrl}/${id}/confirmar-devolucion`, {});
}
// Línea 32 corregida
devolverTurno(id: number): Observable<any> {
  // Usamos _apiUrl que es como la declaraste arriba
  return this._http.put(`${this._apiUrl}/${id}/devolver`, {});
}


  /**
   * Opcional: Obtener historial de novedades por servicio
   */
  getNovedadById(id: number): Observable<NovedadListar> {
    return this._http.get<NovedadListar>(`${this._apiUrl}/${id}`);
  }
}