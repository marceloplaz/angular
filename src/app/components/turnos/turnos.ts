import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { 
  DragDropModule, 
  CdkDragDrop, 
  CdkDropListGroup, 
  CdkDropList, 
  CdkDrag, 
  CdkDragPlaceholder 
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    CdkDropListGroup, 
    CdkDropList, 
    CdkDrag, 
    CdkDragPlaceholder 
  ],
  templateUrl: './turnos.html',
  styleUrl: './turnos.scss',
})
export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private cdRef = inject(ChangeDetectorRef);

  // Propiedades de datos
  servicios: any[] = [];
  categorias: any[] = [];
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  personalAgrupado: any[] = []; 
  listaTurnos: any[] = [];
  
  // Propiedades de Historial y Modales
  historialCambios: any[] = []; 
  mostrarConfirmacion: boolean = false;
  datosTemporal: any = {};
  
  filters = { 
    servicio_id: null as any, 
    categoria_id: '' as any,
    gestion: 2026, 
    mes_id: null as any, 
    semana_id: null as any 
  };

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  cargando: boolean = false;
  mostrarModal = false;
  personalSeleccionado: any = null;
  diaSeleccionado: string = '';
  turnoIdSeleccionado: any = null;

  ngOnInit() {
    this.cargarCategorias();
    this.cargarTiposDeTurnos();
    this.cargarConfiguracionInicial();
  }

  // --- CARGA DE DATOS ---

  cargarCategorias() {
    this.turnoService.getCategorias().subscribe({
      next: (res: any) => {
        this.categorias = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err: any) => console.error("Error categorías", err)
    });
  }

  cargarTiposDeTurnos() {
    this.turnoService.getTurnos({}).subscribe({ 
      next: (res: any) => {
        this.listaTurnos = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err: any) => console.error("Error tipos turnos", err)
    });
  }

  cargarConfiguracionInicial() {
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios = res.data;
      if (this.servicios.length > 0) this.filters.servicio_id = this.servicios[0].id;
      
      this.turnoService.getConfiguracionCalendario().subscribe((resCal: any) => {
        const data = resCal.data || resCal;
        const gestionActual = data.gestiones?.find((g: any) => g.año == this.filters.gestion);
        if (gestionActual) {
          this.mesesDisponibles = gestionActual.meses;
          const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
          if (mesActual) {
            this.filters.mes_id = mesActual.id;
            this.semanasDisponibles = mesActual.semanas;
            this.filters.semana_id = this.semanasDisponibles[0]?.id;
          }
        }
        this.cargarTurnos();
      });
    });
  }

  cargarTurnos() {
    if (!this.filters.servicio_id || !this.filters.semana_id) return;
    this.cargando = true;
    this.cdRef.detectChanges();

    this.turnoService.getEquipoPorFiltros(this.filters.servicio_id, this.filters.categoria_id, this.filters.semana_id)
      .subscribe({
        next: (res: any) => {
          this.personalAgrupado = res.equipo_visible || res.data || res;
          this.cargando = false;
          this.cdRef.detectChanges();
        },
        error: (err: any) => { 
          this.cargando = false; 
          this.cdRef.detectChanges(); 
        }
      });
  }

  // --- LÓGICA DE MOVIMIENTO (DRAG & DROP) ---

  onTurnoMovido(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) return;

    const origen = event.previousContainer.data;
    const destino = event.container.data;
    const turno = event.item.data;

    this.datosTemporal = {
      payload: {
        turno_id: turno.id_asignacion || turno.id,
        nuevo_usuario_id: destino.usuario_id,
        nueva_fecha: this.obtenerFechaReal(destino.fecha)
      },
      origenNombre: origen.usuario_nombre,
      destinoNombre: destino.usuario_nombre,
      fechaDestino: destino.fecha,
      nombreTurno: turno.nombre_turno,
      esIntercambio: !!destino.usuario_id 
    };

    if (!this.datosTemporal.payload.turno_id) return;

    this.mostrarConfirmacion = true; 
  }

  confirmarMovimiento() {
    this.turnoService.actualizarPosicion(this.datosTemporal.payload).subscribe({
      next: (res: any) => {
        const accion = res.intercambio ? 'intercambió' : 'reasignó';
        this.historialCambios.unshift({
          texto: `Se ${accion} el turno de ${this.datosTemporal.origenNombre} con ${this.datosTemporal.destinoNombre}`,
          hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fecha_movimiento: new Date()
        });

        this.cerrarConfirmacion();
        this.cargarTurnos();
      },
      error: (err: any) => {
        alert("Error al mover el turno");
        this.cerrarConfirmacion();
      }
    });
  }

  cancelarMovimiento() {
    this.cerrarConfirmacion();
  }

  cerrarConfirmacion() {
    this.mostrarConfirmacion = false;
    this.datosTemporal = {};
  }

  // --- ASIGNACIÓN MANUAL ---

  guardarAsignacion() {
    if (!this.turnoIdSeleccionado) return;

    const payload = {
      usuario_id: this.personalSeleccionado.usuario_id,
      servicio_id: this.filters.servicio_id,
      turno_id: this.turnoIdSeleccionado,
      semana_id: this.filters.semana_id,
      mes_id: this.filters.mes_id,
      gestion_id: 1, 
      fecha: this.obtenerFechaReal(this.diaSeleccionado),
      estado: 'programado'
    };

    this.turnoService.asignarTurno(payload).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarTurnos();
      },
      error: (err: any) => console.error("Error al guardar:", err)
    });
  }

  // --- ACCIONES MASIVAS ---

  onReplicarMes() {
    if (confirm(`¿Replicar esta semana a todo el mes?`)) {
      this.turnoService.replicarSemanaEnMes(this.filters.servicio_id, this.filters.mes_id, this.filters.semana_id)
        .subscribe(() => { alert("Mes replicado"); this.cargarTurnos(); });
    }
  }

  onRotarMensual() {
    const idMesDestino = prompt("Introduce el ID del MES al que deseas rotar el personal:");
    if (!idMesDestino) return;
    
    this.turnoService.rotarPersonalMensual(this.filters.servicio_id, this.filters.mes_id, Number(idMesDestino))
      .subscribe({
        next: () => {
          alert("Personal rotado exitosamente.");
          this.cargarTurnos();
        },
        error: (err: any) => alert("Error en rotación: " + (err.error?.message || 'Error desconocido'))
      });
  }

  // Se renombra para que coincida con el (click)="vaciarCalendario()" de tu HTML
  vaciarCalendario() {
    if (confirm("¿Estás seguro de vaciar todos los turnos del mes?")) {
      this.turnoService.vaciarMes(this.filters.servicio_id, this.filters.mes_id)
        .subscribe({
          next: () => {
            alert("Calendario vaciado.");
            this.cargarTurnos();
          },
          error: (err: any) => console.error("Error al vaciar:", err)
        });
    }
  }

  // --- MÉTODOS AUXILIARES ---

  obtenerTurnoAsignado(usuario: any, nombreDiaColumna: string) {
    if (!usuario.turnos) return null;
    const fechaBuscada = this.obtenerFechaReal(nombreDiaColumna);
    return usuario.turnos.find((t: any) => t.fecha === fechaBuscada);
  }

  obtenerFechaReal(nombreDia: string): string {
    const semanaActual = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
    if (!semanaActual) return '';

    const partes = semanaActual.fecha_inicio.split('-');
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 12, 0, 0);
    
    const indiceDia = this.diasSemana.indexOf(nombreDia);
    if (indiceDia !== -1) {
      fecha.setDate(fecha.getDate() + indiceDia);
    }

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    return `${año}-${mes}-${dia}`;
  }

  calcularTotalHoras(usuario: any): number {
    if (!usuario?.turnos) return 0;
    return usuario.turnos.reduce((acc: number, t: any) => {
      if (t.horario?.includes(' - ')) {
        const [inicio, fin] = t.horario.split(' - ');
        let diff = parseInt(fin) - parseInt(inicio);
        if (diff <= 0) diff += 24;
        return acc + diff;
      }
      return acc;
    }, 0);
  }

  onFilterChange() { this.cargarTurnos(); }

  onCambioMes(mesId: any) {
    const mes = this.mesesDisponibles.find(m => m.id == mesId);
    this.semanasDisponibles = mes ? mes.semanas : [];
    if (this.semanasDisponibles.length > 0) {
      this.filters.semana_id = this.semanasDisponibles[0].id;
      this.onFilterChange();
    }
  }

  abrirModalAsignar(personal: any, dia: string) {
    this.personalSeleccionado = { ...personal };
    this.diaSeleccionado = dia;
    this.turnoIdSeleccionado = null;
    this.mostrarModal = true;
  }

  cerrarModal() { this.mostrarModal = false; }
}