import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
// Importa la interfaz que definimos anteriormente
import { CrearAreaRequest } from '../interfaces/area'; 

@Injectable({
  providedIn: 'root'
})
export class AreaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/areas`; 
  
  // GET: Obtiene las áreas (el backend debería incluir la relación 'categoria')
  getAreasPorServicio(servicioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicio/${servicioId}`);
  }
  
 crearArea(data: CrearAreaRequest): Observable<any> {
  return this.http.post(`${this.apiUrl}/guardar`, data);
}

  // DELETE: Correcto
  eliminarArea(areaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${areaId}`);
  }
}