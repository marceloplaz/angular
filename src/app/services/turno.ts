import { Injectable, inject } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http'; 
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment.development';
@Injectable({
  providedIn: 'root'
})
export class TurnoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

  getAreas(servicioId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/areas`, {
    params: { servicio_id: servicioId.toString() }
  });
   }
   getFiltrosJerarquia(): Observable<{ categorias: any[], servicios: any[] }> {
    return this.http.get<{ categorias: any[], servicios: any[] }>(`${this.apiUrl}/filtros-jerarquia`);
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
getEquipoPorFiltros(servicioId: any, categoriaId: any, semanaId: any, mesId: any): Observable<any> {
  return this.http.get(`${this.apiUrl}/equipo-filtrado`, {
    params: { 
      servicio_id: servicioId || '',
      categoria_id: categoriaId || '', 
      semana_id: semanaId || '',
      mes_id: mesId || '' 
    }
  });
}
  getTurnos(params: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/lista-turnos-disponibles`, { params });
  }
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
  replicarSemanaEnMes(servicioId: number, mesId: number, semanaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/replicar-mes`, {
      servicio_id: servicioId,
      mes_id: mesId,
      semana_id: semanaId
    });
  }
  rotarPersonalMensual(payload: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/turnos-asignados/rotar-mensual`, payload);
}
 
 getResumenMensual(servicioId: number, mesId: number, categoriaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reportes/turnos/resumen-mensual`, {
      params: {
        servicio_id: servicioId.toString(),
        mes_id: mesId.toString(),
        categoria_id: categoriaId.toString() 
      }
    });
  }
    vaciarMes(servicioId: number, mesId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados/vaciar-mes`, {
      servicio_id: servicioId,
      mes_id: mesId
    });
  }
  getTurnosPorServicio(servicioId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/servicios/${servicioId}/turnos-habilitados`);
  }
  vincularTurnosAServicio(data: { servicio_id: number, turnos_ids: number[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/servicios/vincular-turnos`, data);
  }
 
 buscarProfesionales(termino: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/buscar-profesionales`, {
      params: { buscar: termino }
    });
  }

getReporteMensual(mes_id: number, gestion: number, servicio_id: number): Observable<any[]> {
    const params = new HttpParams()
    .set('mes_id', mes_id.toString())
    .set('gestion', gestion.toString())
    .set('servicio_id', servicio_id.toString());

  return this.http.get<any[]>(`${this.apiUrl}/reporte-mensual`, { params });
}
getServiciosPorUsuario(usuarioId: number): Observable<any> {
  return this.http.get(`${this.apiUrl}/usuarios/${usuarioId}/servicios`);
}
  crearTurno(data: { nombre_turno: string, hora_inicio: string, hora_fin: string, duracion_horas: number }): Observable<any> {
  return this.http.post(`${this.apiUrl}/turnos`, data);
}
eliminarTipoTurno(id: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/turnos/${id}`);
}
// En tu Servicio (TurnoService)
getReporteSemanalPdf(semanaId: number, servicioId: number, categoriaIds: any[]): Observable<Blob> {
    
    // Construimos la query string manualmente
    let queryParams = `servicio_id=${servicioId}`;
    
    if (categoriaIds && categoriaIds.length > 0) {
        // Esto crea: &categoria_id[]=1&categoria_id[]=2
        const cats = categoriaIds.map(id => `categoria_id[]=${id}`).join('&');
        queryParams += `&${cats}`;
    }

    // URL final: .../reportes/semanal/471?servicio_id=1&categoria_id[]=2
    return this.http.get(`${this.apiUrl}/reportes/semanal/${semanaId}?${queryParams}`, {
        responseType: 'blob'
    });
}
cambiarBloqueoRol(servicio_id: any, mes_id: any, estado: boolean) {
  return this.http.put(`${this.apiUrl}/turnos-asignados/cambiar-bloqueo`, {
    servicio_id: servicio_id,
    mes_id: mes_id,
    bloquear: estado 
  });
}
obtenerPdfReporteMensual(servicio_id: number, mes_id: number, usuario_rol: string, categoria_id: any): Observable<Blob> {
  const params = new HttpParams()
    .set('servicio_id', servicio_id.toString())
    .set('mes_id', mes_id.toString())
    .set('rol_usuario', usuario_rol)
    .set('categoria_id', categoria_id.toString()); 
  return this.http.get(`${environment.apiUrl}/acciones-reporte/mensual-pdf`, {
    params: params,
    responseType: 'blob'
  });
}
getSemanasPorMes(mesId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/calendario/configuracion`);
  }
getReporteHorasSemana(semanaId: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/reportes/reporte-semanal/${semanaId}`);
}
}
