import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Persona } from '../interfaces/persona';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private http = inject(HttpClient);
  
  // URL en singular corregida para coincidir con api.php
  private API_URL = 'http://localhost:8000/api/v1/persona';

  // Cambiamos Persona[] por any para capturar el objeto de paginación
  getPersonas(): Observable<any> {
    return this.http.get<any>(this.API_URL);
  }

  getPersona(id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.API_URL}/${id}`);
  }

  crearPersona(persona: Persona): Observable<any> {
    return this.http.post(this.API_URL, persona);
  }
}