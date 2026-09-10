import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccesoService {
  private apiUrl = 'http://localhost:8000/api/v1/gestion-accesos'; 

  private cambioPermisosSubject = new Subject<any>();
  public cambioPermisos$ = this.cambioPermisosSubject.asObservable();
  
  constructor(private http: HttpClient) { }
  
  notificarCambioPermisos(usuarioId?: any): void {
    this.cambioPermisosSubject.next(usuarioId);
  }
  getDatosIniciales(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/inicializar`);
  }

  buscarEmpleado(termino: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/buscar-empleado?q=${termino}`);
  }

  guardarMatriz(payload: { user_id: number; role_id: number; servicios_ids: number[]; permisos_ids: number[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/guardar-matriz`, payload);
  }

  getSemanasPorMesYCategoria(mesId: any, categoriaId?: any): Observable<any> {
    let params = new HttpParams().set('mes_id', mesId);

    if (categoriaId && categoriaId !== 'todos' && categoriaId !== 'todas' && categoriaId !== '') {
      params = params.set('categoria_id', categoriaId);
    }

    return this.http.get<any>(`${this.apiUrl}/semanas-por-mes`, { params });
  }

  generarSemanas(data: { mes_id: number; fecha_inicio: string; fecha_fin: string; categoria_id?: number | null }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generar-semanas`, data);
  }

  getGestiones(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/gestiones`);
  }

  actualizarSemana(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/semanas/${id}`, data);
  }
 

  getMeses(gestion?: any): Observable<any> {
    let params = new HttpParams();
    if (gestion) {
      params = params.set('gestion', gestion);
    }
    return this.http.get<any>(`${this.apiUrl}/meses`, { params });
  }

  getCategorias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categorias`);
  }
}