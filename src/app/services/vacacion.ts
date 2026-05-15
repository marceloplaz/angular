import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';


@Injectable({
  providedIn: 'root'
})
export class VacacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/vacaciones`;
private rootApiUrl = environment.apiUrl;
  

programarFechas(id: number, datos: { fecha_inicio: string, fecha_fin: string }): Observable<any> {
        return this.http.put(`${this.apiUrl}/programar/${id}`, datos);
  }

  getPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pendientes`);
  }

  actualizarEstado(id: number, estado: number, observaciones?: string, dias?: number): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/${id}/estado`, { 
    estado, 
    observaciones,
    dias_solicitados: dias // Enviamos los días ajustados en el modal
  });
}
  /**
   * Obtiene el historial de vacaciones de un usuario específico.
   * @param id ID del usuario (de la tabla users)
   */
  getHistorialByUsuario(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuario/${id}`);
  }

  /**
   * Registra una nueva solicitud de vacación.
   * @param datos Objeto con los campos de la migración (usuario_id, servicio_id, etc.)
   */
  store(datos: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, datos);
  }

  /**
   * Actualiza el estado de la solicitud (Aprobar o Rechazar).
   * @param id ID de la vacación
   * @param estado 1 para Aprobado, 2 para Rechazado
   * @param observaciones Motivo del rechazo o nota adicional
   */
 
 
  getGestiones(): Observable<any[]> {
  
  return this.http.get<any[]>(`${this.rootApiUrl}/gestiones`);
}

  getServicios(): Observable<any[]> {
   
  return this.http.get<any[]>(`${this.rootApiUrl}/servicios-lista`); 
}

getCategorias(): Observable<any[]> {
  
  return this.http.get<any[]>(`${this.rootApiUrl}/categorias-lista`);
}
  



  getEquipoPorFiltros(servicioId: any, categoriaId: any, semanaId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipo-filtrado`, {
      params: { 
        servicio_id: servicioId || '',
        categoria_id: categoriaId || '', 
      
      }
    });
  }



  getHistorialKardex(userId: number): Observable<any> { // <--- Cambia any[] por any
  return this.http.get<any>(`${this.apiUrl}/kardex/historial/${userId}`);
}

  /**
   * Guarda un nuevo registro o actualiza uno existente en el Kardex
   */
  guardarKardex(datos: any): Observable<any> {
    if (datos.id) {
      // Si tiene ID, es una actualización
      return this.http.put<any>(`${this.apiUrl}/kardex/${datos.id}`, datos);
    } else {
      // Si no tiene ID, es un registro nuevo
      return this.http.post<any>(`${this.apiUrl}/kardex`, datos);
    }
  }

  /**
   * Elimina un registro del historial
   */
  eliminarRegistroKardex(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/kardex/${id}`);
  }
}

