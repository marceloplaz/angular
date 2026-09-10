import { HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { inject, Injectable} from '@angular/core';
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

  getReporteAlimentacionPersona(personaId: number): Observable<any> {
  // Limpiamos '/usuarios' para apuntar a /persona/{id}/reporte-alimentacion
  const urlLimpia = this.API_URL.replace('/usuarios', '') + `/persona/${personaId}/reporte-alimentacion`;
  
  return this.http.get<any>(urlLimpia, { headers: this.getHeaders() });
}
 

getEspecialista(id: string | number) {
  return this.http.get(`${this.API_URL}/${id}`);
}

getMatrizTurnos(
  mes_id: any, 
  gestion: any, 
  filtro: string, 
  categoriaModal?: string, 
  fecha_inicio?: string, 
  fecha_fin?: string
): Observable<any> {

  let params = new HttpParams()
    .set('mes_id', mes_id)
    .set('gestion', gestion);

  if (fecha_inicio) params = params.set('fecha_inicio', fecha_inicio);
  if (fecha_fin) params = params.set('fecha_fin', fecha_fin);

  const tiposSalarioValidos = ['tgn', 'sus', 'contrato', 'gob', 'internos', 'residentes'];

  if (filtro && filtro.toLowerCase() !== 'todos') {
    if (tiposSalarioValidos.includes(filtro.toLowerCase())) {
      params = params.set('tipo_salario', filtro);
    } else {
      if (!isNaN(Number(filtro))) {
        params = params.set('categoria_id', filtro);
      } else {
        params = params.set('categoria_nombre', filtro);
      }
    }
  }

  if (categoriaModal && categoriaModal.toLowerCase() !== 'todos' && categoriaModal.toLowerCase() !== 'todas') {
    if (!isNaN(Number(categoriaModal))) {
      params = params.set('categoria_id', categoriaModal);
    } else {
      params = params.set('categoria_nombre', categoriaModal);
    }
  }

  return this.http.get<any>(`${this.API_URL}/reporte-turnos`, { 
    params, 
    headers: this.getHeaders() 
  });
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