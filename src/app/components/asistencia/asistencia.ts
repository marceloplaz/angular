import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

  totalRecords: number = 0;
  rows: number = 15;
  first: number = 0;
  paginaActual: number = 1;

  constructor(
    private asistenciaService: AsistenciaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaFin = hoy.toISOString().substring(0, 10);
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicio = inicioMes.toISOString().substring(0, 10);

    this.cargarCategorias();
  }

  inicializarFechas() {
    const hoy = new Date();

    const yearHoy = hoy.getFullYear();
    const monthHoy = String(hoy.getMonth() + 1).padStart(2, '0');
    const dayHoy = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyFormateada = `${yearHoy}-${monthHoy}-${dayHoy}`;

    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const yearAyer = ayer.getFullYear();
    const monthAyer = String(ayer.getMonth() + 1).padStart(2, '0');
    const dayAyer = String(ayer.getDate()).padStart(2, '0');
    const fechaAyerFormateada = `${yearAyer}-${monthAyer}-${dayAyer}`;

    this.fechaInicio = fechaAyerFormateada;
    this.fechaFin = fechaHoyFormateada;

    this.modalGestion = hoy.getFullYear();
    this.modalMes = hoy.getMonth() + 1;
    this.calcularFechasPorMes();
  }

  cargarCategorias() {
    this.asistenciaService.obtenerCategorias?.().subscribe({
      next: (res: any) => {
        this.listaCategorias = res?.data || res || [];
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  onPageChange(event: any): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 15;

    const pagina = Math.floor(this.first / this.rows) + 1;
    this.buscarAsistencia(pagina);
  }
  
  buscarAsistencia(page: number = 1): void {
    if (page === 1) {
      this.first = 0;
    }

    setTimeout(() => {
      this.cargando = true;
      this.cdr.detectChanges();
    });

    const params = {
      ci: this.ciBusqueda,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      page: page,
      per_page: this.rows
    };

    this.asistenciaService.obtenerReporteRango(params).subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.registros = res.data.data || [];
          this.totalRecords = res.data.total || 0;
        } else {
          this.registros = [];
          this.totalRecords = 0;
        }
        this.finalizarCarga();
      },
      error: (err) => {
        console.error('Error al obtener la asistencia:', err);
        this.registros = [];
        this.totalRecords = 0;
        this.finalizarCarga();
      }
    });
  }

  private finalizarCarga(): void {
    this.cargando = false;
    this.cdr.detectChanges();
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

          'FALTAS': emp.faltas,
          'MINUTOS RETRASO': emp.minutos_retraso,
          'ABAND.': emp.abandono,
          'OMISIÓN MARCADO INGRESO/SALIDA': emp.omision_marcado,
          'TOTAL DÍAS A DESCONTAR': emp.total_dias_descontar,

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