import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { signal } from '@angular/core';
// En lugar de '../models/turno.interface'
import { ApiResponseTurnos } from '../interfaces/turno';


@Injectable({
  providedIn: 'root'
})
export class ServicioService {
  // Usamos directamente la variable del environment sin añadir nada más
  private readonly url: string = environment.apiUrl; 

  
  constructor(private http: HttpClient) { }


public servicioSeleccionado = signal<any>(null);

 getTurnosPorServicio(usuarioId: number, servicioId: number, mes: number, anio: number): Observable<ApiResponseTurnos> {
    return this.http.get<ApiResponseTurnos>(
      `${this.url}/turnos/mis-turnos`, {
        params: {
          usuario_id: usuarioId.toString(), // Se envía, aunque el backend podría ignorarlo si usa Auth::id()
          servicio_id: servicioId.toString(),
          mes: mes.toString(),
          anio: anio.toString()
        }
      }
    );
}



  /**
   * Obtiene los servicios asignados a un usuario específico (para ver el calendario de otros)
   */
 

getServiciosPorUsuario(usuarioId: number): Observable<any> {
  return this.http.get(`${this.url}/usuarios/${usuarioId}/servicios`);
}

  crearTurno(data: { nombre_turno: string, hora_inicio: string, hora_fin: string, duracion_horas: number }): Observable<any> {
  // CAMBIO CLAVE: Cambiar 'lista-turnos-disponibles' por 'turnos'
  return this.http.post(`${this.url}/turnos`, data);
}

getServiciosInicio(): Observable<any> {
  // Nueva ruta específica para el dashboard del usuario
  return this.http.get(`${this.url}/servicios/inicio`);
}

// Método para actualizar el servicio activo
  
  // En src/app/services/servicios.ts (o la ruta que uses)


  seleccionarServicio(servicio: any) {
    this.servicioSeleccionado.set(servicio);
  }
  // Obtener todos los servicios
  getServicios(): Observable<any> {
    return this.http.get(`${this.url}/servicios`);
  }

  // Obtener un solo servicio (Corregido: sin llaves extra)
  getServicio(id: number): Observable<any> {
    return this.http.get(`${this.url}/servicios/${id}`);
  }

  // Eliminar servicio
  deleteServicio(id: number): Observable<any> {
    return this.http.delete(`${this.url}/servicios/${id}`);
  }
vincularUsuario(data: any): Observable<any> {
  // Asegúrate de que la URL coincida con tu API (v1/usuario-servicio o similar)
  return this.http.post(`${this.url}/usuario-servicio`, data);
}
  // Crear servicio
  createServicio(servicio: any): Observable<any> {
    return this.http.post(`${this.url}/servicios`, servicio);
  }

  // Actualizar servicio
  updateServicio(id: number, servicio: any): Observable<any> {
    // Es vital enviar el ID y el objeto con los datos validados
    return this.http.put(`${this.url}/servicios/${id}`, servicio);
  }

  // --- GESTIÓN DE PERSONAL ---

  buscarProfesionales(termino: string): Observable<any> {
  return this.http.get(`${this.url}/buscar-profesionales?buscar=${termino}`);
}

  vincularProfesional(datos: any): Observable<any> {
  return this.http.post(`${this.url}/usuario-servicio`, datos);
}

  desvincularProfesional(id: number): Observable<any> {
    return this.http.delete(`${this.url}/usuario-servicio/${id}`);
  }
}