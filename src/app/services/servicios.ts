import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs'; 
import { Servicio } from '../interfaces/servicio';
import { environment } from '../../environments/environment.development';
@Injectable({ providedIn: 'root' })
export class ServicioService {
  
  private myAppUrl: string = environment.apiUrl; // http://127.0.0.1:8000/api/v1
  private myApiUrl = 'servicios';

  constructor(private http: HttpClient) { }

 // servicios.service.ts
getServicios(): Observable<any> {
  // Al añadir '/' aquí, la URL será: http://127.0.0.1:8000/api/v1/servicios
  return this.http.get(`${this.myAppUrl}/${this.myApiUrl}`);
}

  createServicio(servicio: Servicio): Observable<any> {
    return this.http.post(`${this.myAppUrl}/${this.myApiUrl}`, servicio);
  }

  // servicios.service.ts
updateServicio(id: number, servicio: Servicio): Observable<void> {
  // Usa solo UNA barra para separar la URL base del endpoint y el ID
  return this.http.put<void>(`${this.myAppUrl}/${this.myApiUrl}/${id}`, servicio);
}

  deleteServicio(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}/${this.myApiUrl}/${id}`);
  }
}