import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Eliminamos HttpHeaders para evitar duplicidad
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

  // --- CONFIGURACIÓN Y LISTAS ---


  getAreas(servicioId: number): Observable<any> {
  // Asegúrate de que tu endpoint coincida con la ruta de tu API
  return this.http.get(`${this.apiUrl}/areas`, {
    params: { servicio_id: servicioId.toString() }
  });
}
  getConfiguracionCalendario(): Observable<any> {
    return this.http.get(`${this.apiUrl}/calendario/configuracion`);
  }

  getServicios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios`);
  }

  getCategorias(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categorias-lista`);
  }

  getEquipoPorFiltros(servicioId: any, categoriaId: any, semanaId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/equipo-filtrado`, {
      params: { 
        servicio_id: servicioId || '',
        categoria_id: categoriaId || '', 
        semana_id: semanaId || ''
      }
    });
  }

  getTurnos(params: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/lista-turnos-disponibles`, { params });
  }

  // --- ASIGNACIÓN Y EDICIÓN ---

  asignarTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados`, data);
  }

  actualizarPosicion(data: { turno_id: number, nuevo_usuario_id: number, nueva_fecha: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/actualizar`, data);
  }

  actualizarTurnoAsignado(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/turnos-asignados/${id}`, data);
  }

  eliminarTurnoAsignado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/turnos-asignados/${id}`);
  }

  // --- ACCIONES MASIVAS ---

  /**
   * Replica los turnos de la semana actual a todas las semanas del mes
   */
  replicarSemanaEnMes(servicioId: number, mesId: number, semanaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/replicar-mes`, {
      servicio_id: servicioId,
      mes_id: mesId,
      semana_id: semanaId
    });
  }

  /**
   * Rota al personal del mes actual al mes siguiente
   */
  rotarPersonalMensual(servicioId: number, mesId: number, mesDestinoId: number): Observable<any> {
    // Ya no inyectamos headers aquí porque el authInterceptor lo hace automáticamente
    return this.http.post(`${this.apiUrl}/turnos-asignados/rotar-mensual`, {
      servicio_id: servicioId,
      mes_id: mesId,
      mes_destino: mesDestinoId
    });
  }
  
  getResumenMensual(servicioId: number, mesId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/turnos/resumen-mensual`, {
      params: {
        servicio_id: servicioId.toString(),
        mes_id: mesId.toString()
      }
    });
  }
  /**
   * Elimina todos los turnos programados del mes para un servicio
   */
  vaciarMes(servicioId: number, mesId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/vaciar-mes`, {
      servicio_id: servicioId,
      mes_id: mesId
    });
  }

  //configuracion de sistema
  getTurnosPorServicio(servicioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/servicios/${servicioId}/turnos-habilitados`);
  }

  /**
   * Sincroniza (víncula/desvincula) los turnos permitidos para un servicio
   */
  vincularTurnosAServicio(data: { servicio_id: number, turnos_ids: number[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/servicios/vincular-turnos`, data);
  }

  crearTurno(data: { nombre_turno: string, hora_inicio: string, hora_fin: string, duracion_horas: number }): Observable<any> {
  // CAMBIO CLAVE: Cambiar 'lista-turnos-disponibles' por 'turnos'
  return this.http.post(`${this.apiUrl}/turnos`, data);
}

/**
 * Elimina un tipo de turno del catálogo
 * Corresponde a: DELETE v1/turnos/{id} (Admin)
 */
eliminarTipoTurno(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/turnos/${id}`);
}

}