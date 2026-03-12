import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Persona } from '../interfaces/persona';
// Cambia esto en la línea 5 de tu servicio
// Sube tres niveles para salir de 'services', 'app' y llegar a 'environments'
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private http = inject(HttpClient);
  
  // Usamos la URL del environment detectada en tu terminal: http://127.0.0.1:8000/api/v1
  // Esta línea ahora funcionará correctamente al detectar 'apiUrl' corregido
private readonly API_URL = `${environment.apiUrl}/persona`; 

  /**
   * Obtiene la lista de personas. 
   * Se usa 'any' porque Laravel devuelve un objeto con 'data' y paginación.
   */
  getPersonas(): Observable<any> {
    return this.http.get<any>(this.API_URL);
  }

  /**
   * Obtiene una persona específica por ID.
   */
  getPersona(id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo registro de personal.
   */
  crearPersona(persona: Persona): Observable<any> {
    return this.http.post<any>(this.API_URL, persona);
  }

  /**
   * Actualiza los datos de una persona existente.
   */
  updatePersona(id: number, persona: Persona): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, persona);
  }

  /**
   * Elimina un registro (Requiere lógica de AdminAuthorization en el backend).
   */
  deletePersona(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }
}