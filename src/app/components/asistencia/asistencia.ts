import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AsistenciaService } from '../../services/asistencia'; 
import { AsistenciaRegistro } from '../../interfaces/asistencia'; 
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-asistencia',
  standalone: true, 
  imports: [CommonModule, FormsModule, TableModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.scss'
})
export class AsistenciaComponent implements OnInit {
  private asistenciaService = inject(AsistenciaService);

  registros: AsistenciaRegistro[] = [];
  cargando: boolean = false;

  // Valor del input de búsqueda (CI o ID)
  ciBusqueda: string = ''; 
  fechaInicio: string = '2026-02-01';
  fechaFin: string = '2026-02-28';

  ngOnInit() {
    this.buscarAsistencia();
  }

  buscarAsistencia() {
    if (!this.fechaInicio || !this.fechaFin) {
      console.warn('Las fechas son obligatorias');
      return;
    }

    this.cargando = true;
    const valorLimpio = this.ciBusqueda.trim();

    // Construcción dinámica de los parámetros de búsqueda
    const busquedaParams: { ci?: string; usuarioId?: number } = {};

    if (valorLimpio !== '') {
      // Si tiene 5 o más dígitos se envía como C.I., de lo contrario como ID interno
      if (valorLimpio.length >= 5) {
        busquedaParams.ci = valorLimpio;
      } else {
        busquedaParams.usuarioId = Number(valorLimpio);
      }
    }

    this.asistenciaService.obtenerReporteRango(busquedaParams, this.fechaInicio, this.fechaFin)
      .pipe(
        finalize(() => {
          this.cargando = false; 
        })
      )
      .subscribe({
        next: (response: any) => {
          this.registros = response?.data || [];
        },
        error: (err) => {
          console.error('Error al obtener asistencia:', err);
          this.registros = [];
        }
      });
  }
}