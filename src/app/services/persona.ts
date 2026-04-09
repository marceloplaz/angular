import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private http = inject(HttpClient);
  
  // Usamos API_URL de forma consistente
  private readonly API_URL = `${environment.apiUrl}/usuarios`; 
  

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json' 
    });
  }

  // En services/persona.ts
getEspecialista(id: string | number) {
  return this.http.get(`${this.API_URL}/${id}`);
}

exportarPdf(): Observable<Blob> {
  // Opción A: Si tu API_URL ya tiene "/usuarios", la limpiamos:
  const urlLimpia = this.API_URL.replace('/usuarios', '') + '/personal/exportar-pdf';
  
  // Opción B (Más segura): Escribe la ruta completa para probar
  // const urlLimpia = 'http://127.0.0.1:8000/api/v1/personal/exportar-pdf';

  return this.http.get(urlLimpia, {
    headers: this.getHeaders(),
    responseType: 'blob'
  });
}

getPersonas(): Observable<any> {
    return this.http.get<any>(this.API_URL, { headers: this.getHeaders() });
  }

 getPersona(id: number): Observable<any> {
  // Esto llamará a: api/v1/persona/{id}
  return this.http.get<any>(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
}

  /**
   * Registra un nuevo usuario con su respectiva persona y rol.
   * Acepta el objeto anidado del Send Request
   */
  crearPersona(datos: any): Observable<any> {
    // CORRECCIÓN: Se usa this.API_URL y se agregan los headers con el token
    return this.http.post<any>(this.API_URL, datos, { headers: this.getHeaders() });
  }

  updatePersona(id: number, persona: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, persona, { headers: this.getHeaders() });
  }

  deletePersona(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
  }
}