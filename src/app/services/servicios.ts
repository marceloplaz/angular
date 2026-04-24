import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ServicioService {
  // Usamos directamente la variable del environment sin añadir nada más
  private readonly url: string = environment.apiUrl; 

  constructor(private http: HttpClient) { }

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