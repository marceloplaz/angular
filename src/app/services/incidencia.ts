import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Incidencia } from '../interfaces/incidencia'; 
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class IncidenciaService {
  // environment.apiUrl debe ser: http://localhost:8000/api/v1
  private myAppUrl: string = environment.apiUrl; 
  private myApiUrl = 'incidencias'; 

  constructor(private http: HttpClient) { }

  getIncidencias(): Observable<Incidencia[]> {
    return this.http.get<Incidencia[]>(`${this.myAppUrl}/${this.myApiUrl}`);
  }

  crearIncidencia(incidencia: Incidencia): Observable<any> {
    return this.http.post(`${this.myAppUrl}/${this.myApiUrl}`, incidencia);
  }
}