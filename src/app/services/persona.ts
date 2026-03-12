import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Persona } from '../interfaces/persona';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private http = inject(HttpClient);
  // Se cambia a /usuarios para que coincida con la ruta funcional de tu API
  private readonly API_URL = `${environment.apiUrl}/usuarios`; 

  // Función privada para obtener los headers con el token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  getPersonas(): Observable<any> {
    return this.http.get<any>(this.API_URL, { headers: this.getHeaders() });
  }

  getPersona(id: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
  }

  crearPersona(persona: Persona): Observable<any> {
    return this.http.post<any>(this.API_URL, persona, { headers: this.getHeaders() });
  }

  updatePersona(id: number, persona: any): Observable<any> {
  return this.http.put<any>(`${this.API_URL}/${id}`, persona, { headers: this.getHeaders() });
}

  deletePersona(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
  }
}