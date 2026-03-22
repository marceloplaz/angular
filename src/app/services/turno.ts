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
  return this.http.get(`${this.apiUrl}/turnos-asignados/categorias-lista`);
}

 getEquipoPorFiltros(servicioId: any, categoriaId: any): Observable<any> {
  return this.http.get(`${this.apiUrl}/turnos-asignados/equipo-filtrado`, {
    params: { 
      servicio_id: servicioId ? servicioId.toString() : '',
      categoria_id: categoriaId ? categoriaId.toString() : ''
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