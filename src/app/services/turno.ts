import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

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

  asignarTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados`, data);
  }
getTurnos(params: any): Observable<any> {
  // Cambia la dirección para que use la nueva ruta de Laravel
  return this.http.get(`${this.apiUrl}/lista-turnos-disponibles`, { params });
}

  // --- 🆕 NUEVAS ACCIONES MASIVAS ---

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
  rotarPersonalMensual(servicioId: number, mesBaseId: number, mesDestId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/rotar-mensual`, {
      servicio_id: servicioId,
      mes_base_id: mesBaseId,
      mes_dest_id: mesDestId
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
 // En tu TurnoService
actualizarPosicion(data: { turno_id: number, nuevo_usuario_id: number, nueva_fecha: string }): Observable<any> {
    // CORRECCIÓN: Añadimos 'v1/turnos-asignados/' antes de 'actualizar'
    return this.http.post(`${this.apiUrl}/turnos-asignados/actualizar`, data);
}
}
