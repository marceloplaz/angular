import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comida } from '../interfaces/comida';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ComidaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/comidas`;

  /**
   * Obtiene la lista completa de comidas disponibles (Desayuno, Almuerzo, Té, Cena, etc.)
   */
  getComidas(): Observable<Comida[]> {
    return this.http.get<Comida[]>(this.apiUrl);
  }
}