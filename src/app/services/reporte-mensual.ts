import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReporteMensualService {

  // 1. Canal para que el Dashboard solicite los datos
  private solicitarDatosSource = new Subject<void>();
  solicitarDatos$ = this.solicitarDatosSource.asObservable();

  // 2. Canal para que el componente de Turnos envíe la "foto" actual
  private enviarDatosSource = new Subject<any>();
  enviarDatos$ = this.enviarDatosSource.asObservable();

  /**
   * Método llamado por el DashboardComponent (Botón PDF)
   */
  solicitarReporteActual(): void {
    this.solicitarDatosSource.next();
  }

  /**
   * Método llamado por el TurnosComponent para responder con la data actual
   */
  enviarDatosParaPDF(datos: any): void {
    this.enviarDatosSource.next(datos);
  }
}