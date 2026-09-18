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
  mostrarModal: boolean = false;
  modalMes: number = 9; // Septiembre por defecto
  modalGestion: number = 2026;
  modalFechaInicio: string = '2026-08-01';
  modalFechaFin: string = '2026-08-31';
  modalCategoriaId: any = '';
  listaCategorias: any[] = [];

  // Valor del input de búsqueda (CI o ID)
  ciBusqueda: string = ''; 
  fechaInicio: string = '2026-08-01';
  fechaFin: string = '2026-08-31';

  ngOnInit() {
    this.buscarAsistencia();
    this.cargarCategorias(); // <-- Cargar las categorías al iniciar
  }

  cargarCategorias() {
    // Llamada para obtener las categorías desde tu servicio o endpoint
    this.asistenciaService.obtenerCategorias?.().subscribe({
      next: (res: any) => {
        this.listaCategorias = res?.data || res || [];
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  buscarAsistencia() {
    if (!this.fechaInicio || !this.fechaFin) {
      console.warn('Las fechas son obligatorias');
      return;
    }

    this.cargando = true;
    const valorLimpio = this.ciBusqueda.trim();
    const busquedaParams: { ci?: string; usuarioId?: number } = {};

    if (valorLimpio !== '') {
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

  abrirModalReporteTurnos() {
    this.mostrarModal = true;
    this.calcularFechasPorMes();
  }

  cerrarModalReporteTurnos() {
    this.mostrarModal = false;
  }

  calcularFechasPorMes() {
    if (this.modalMes && this.modalGestion) {
      const inicio = new Date(this.modalGestion, this.modalMes - 1, 1);
      const fin = new Date(this.modalGestion, this.modalMes, 0);

      this.modalFechaInicio = inicio.toISOString().split('T')[0];
      this.modalFechaFin = fin.toISOString().split('T')[0];
    }
  }

  generarMatrizTurnosPdf() {
    if (!this.modalFechaInicio || !this.modalFechaFin) {
      alert('Por favor, selecciona un rango de fechas válido.');
      return;
    }

    this.cargando = true;

    this.asistenciaService.descargarMatrizPdf(this.modalFechaInicio, this.modalFechaFin, this.modalCategoriaId)
      .pipe(
        finalize(() => {
          this.cargando = false;
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          this.cerrarModalReporteTurnos();
        },
        error: (err) => {
          console.error('Error al generar el reporte PDF:', err);
          alert('No se pudo generar el reporte en PDF. Verifique los permisos o datos.');
        }
      });
  }
}