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
// Asegúrate de que la función reciba los 3 parámetros en este orden
// En turno.service.ts
getEquipoPorFiltros(servicioId: any, categoriaId: any, semanaId: any): Observable<any> {
  return this.http.get(`${this.apiUrl}/equipo-filtrado`, {
    params: { 
      servicio_id: servicioId || '',
      categoria_id: categoriaId || '', // Si es "Todas", enviará cadena vacía
      semana_id: semanaId || ''
    }
  });
}

  asignarTurno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos-asignados`, data);
  }

  getTurnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/turnos`);
  }
}