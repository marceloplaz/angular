import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AsistenciaService } from '../../services/asistencia'; 
import { AsistenciaRegistro } from '../../interfaces/asistencia'; 
import { TableModule } from 'primeng/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

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

 exportarExcel(): void {
  if (!this.modalFechaInicio || !this.modalFechaFin) {
    Swal.fire('Atención', 'Seleccione un rango de fechas válido', 'warning');
    return;
  }

  this.cargando = true;

  // Consultar la matriz de datos procesados desde el backend
  this.asistenciaService.obtenerMatrizAsistencia(
    this.modalFechaInicio, 
    this.modalFechaFin, 
    this.modalCategoriaId
  ).subscribe({
    next: (res: any) => {
      this.cargando = false;
      const empleados: any[] = res?.data?.empleados || [];

      if (empleados.length === 0) {
        Swal.fire('Atención', 'No hay datos registrados para exportar en este periodo', 'info');
        return;
      }

      // Mapear los datos con tipos explícitos en (emp: any, index: number)
     const dataExcel = empleados.map((emp: any, index: number) => ({
  'Nº': index + 1,
  'ITEM': emp.item,
  'CARGA HORARIA': emp.carga_horaria,
  'FECHA DE INGRESO': emp.fecha_ingreso,
  'C.I.': emp.ci,
  'CARGO': emp.cargo,
  'TIPO SALARIO / FUENTE': emp.tipo_salario,
  'LUGAR DE TRABAJO': emp.lugar_trabajo,
  'APELLIDO PATERNO': emp.apellido_paterno,
  'APELLIDO MATERNO': emp.apellido_materno,
  'NOMBRES': emp.nombres,

  // Sanciones R.I.P.
  'FALTAS': emp.faltas,
  'MINUTOS RETRASO': emp.minutos_retraso,
  'ABAND.': emp.abandono,
  'OMISIÓN MARCADO INGRESO/SALIDA': emp.omision_marcado,
  'TOTAL DÍAS A DESCONTAR': emp.total_dias_descontar,

  // Novedades Laborales
  'DÍAS EFECT. TRABAJADOS': emp.dias_efect_trabajados,
  'DÍAS DE FALTA': emp.dias_falta,
  'DÍAS DE BAJA MÉDICA': emp.dias_baja_medica,
  'DÍAS DE LICENCIA': emp.dias_licencia,
  'DÍAS DE VACACIÓN': emp.dias_vacacion,
  'DÍAS DE COMISIÓN': emp.dias_comision,
  'DÍAS FERIADO': emp.dias_feriado,
  'DÍAS DE FIN DE SEMANA': emp.dias_fin_semana,
  'TOTAL DÍAS DEL MES': emp.total_dias_mes,
  'OBSERVACIÓN': emp.observacion
}));

      // Generación del archivo binario .xlsx
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataExcel);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PLANILLA DE ASISTENCIA');

      XLSX.writeFile(wb, `Planilla_Asistencia_${this.modalFechaInicio}_al_${this.modalFechaFin}.xlsx`);
    },
    error: (err: any) => {
      this.cargando = false;
      Swal.fire('Error', err?.error?.message || 'Error al obtener datos para el reporte Excel', 'error');
    }
  });
}
}