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
  // "/usuarios","" , la limpiamos:
  const urlLimpia = this.API_URL.replace('/usuarios', '') + '/personal/exportar-pdf';
   return this.http.get(urlLimpia, { headers: this.getHeaders(), responseType: 'blob'  });
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
getCatalogosFormulario(): Observable<any> {
  const urlLimpia = this.API_URL.replace('/usuarios', '') + '/persona-catalogos';
  return this.http.get(urlLimpia, { headers: this.getHeaders() });
}

// ... dentro de tu class PersonaService

/**
 * Importa personal masivamente desde un archivo Excel (TGN, SUS o CONTRATO)
 */
importarPersonalExcel(archivo: File): Observable<any> {
  // Limpiamos la URL para que apunte a /personal/importar
  const urlImport = this.API_URL.replace('/usuarios', '') + '/personal/importar';
  
  // IMPORTANTE: Para enviar archivos NO debemos enviar 'Content-Type': 'application/json'
  // Creamos headers solo con el Token
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
    // El navegador pondrá el Content-Type: multipart/form-data automáticamente
  });

  const formData = new FormData();
  formData.append('file', archivo);

  return this.http.post<any>(urlImport, formData, { headers });
}

}