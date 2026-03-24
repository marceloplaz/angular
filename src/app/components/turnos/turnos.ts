import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html'
})
export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);

  // --- LISTAS PARA COMBOS Y DATOS ---
  servicios: any[] = [];
  categorias: any[] = [];
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  listaTurnos: any[] = []; // Para el select del modal
  personalAgrupado: any[] = []; // Datos de la tabla
  
  // --- FILTROS ---
  filters = { 
    servicio_id: null as any, 
    categoria_id: '' as any,
    gestion: 2026, 
    mes_id: null as any, 
    semana_id: null as any 
  };

  // --- VARIABLES DE ESTADO ---
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  cargando: boolean = false;

  // --- VARIABLES DEL MODAL ---
  mostrarModal = false;
  personalSeleccionado: any = null;
  diaSeleccionado: string = '';
  turnoIdSeleccionado: any = null; 

  ngOnInit() {
    this.cargarConfiguracionInicial();
    this.cargarTiposDeTurnos();
  }

  cargarTiposDeTurnos() {
    this.turnoService.getTurnos().subscribe({
      next: (res: any) => {
        this.listaTurnos = res.data || res; 
      },
      error: (err) => console.error("Error al cargar tipos de turnos", err)
    });
  }

  cargarConfiguracionInicial() {
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios = res.data; 
      if (this.servicios?.length > 0) {
        this.filters.servicio_id = this.servicios[0].id;
        this.cargarCategorias(); 
      }
    });

    this.turnoService.getConfiguracionCalendario().subscribe((res: any) => {
      const data = res.data || res;
      const gestionActual = data.gestiones?.find((g: any) => g.año == this.filters.gestion);
      
      if (gestionActual) {
        this.mesesDisponibles = gestionActual.meses;
        const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
        
        if (mesActual) {
          this.filters.mes_id = mesActual.id;
          this.semanasDisponibles = mesActual.semanas;
          if (this.semanasDisponibles.length > 0) {
            this.filters.semana_id = this.semanasDisponibles[0].id;
          }
        }
        this.cargarTurnos();
      }
    });
  }
// En tu turnos.ts
cargarCategorias() {
  this.turnoService.getCategorias().subscribe({
    next: (res: any) => {
      // Como tu ruta es pública y el controlador devuelve los datos:
      this.categorias = res.data || res; 
    },
    error: (err) => console.error("Error categorías", err)
  });
}

  onFilterChange() {
    this.cargarTurnos();
  }

  cargarTurnos() {
    if (!this.filters.servicio_id || !this.filters.semana_id) return;

    this.cargando = true;
    this.turnoService.getEquipoPorFiltros(
      this.filters.servicio_id, 
      this.filters.categoria_id, 
      this.filters.semana_id
    ).subscribe({
      next: (res: any) => {
        this.personalAgrupado = res?.equipo_visible || res?.data || [];
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.personalAgrupado = [];
      }
    });
  }

  // --- LÓGICA DE ASIGNACIÓN Y MODAL ---

  abrirModalAsignar(personal: any, dia: string) {
    this.personalSeleccionado = { ...personal }; 
    this.diaSeleccionado = dia;
    this.turnoIdSeleccionado = null; 
    this.mostrarModal = true; // Abre el modal visualmente
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.personalSeleccionado = null;
    this.turnoIdSeleccionado = null;
    this.diaSeleccionado = '';
  }

  guardarAsignacion() {
    if (!this.turnoIdSeleccionado) {
      alert("Por favor seleccione un turno");
      return;
    }

    const payload = {
      usuario_id: Number(this.personalSeleccionado.usuario_id),
      servicio_id: Number(this.filters.servicio_id),
      turno_id: Number(this.turnoIdSeleccionado),
      semana_id: Number(this.filters.semana_id),
      mes_id: Number(this.filters.mes_id),
      gestion_id: 1, 
      fecha: this.obtenerFechaReal(this.diaSeleccionado),
      estado: 'programado'
    };

    this.turnoService.asignarTurno(payload).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarTurnos(); // Refresca la tabla
      },
      error: (err) => console.error("Error al guardar", err)
    });
  }

  // ✅ Busca si existe un turno para la fecha de la columna
  obtenerTurnoAsignado(usuario: any, nombreDiaColumna: string) {
    if (!usuario.turnos || usuario.turnos.length === 0) return null;
    const fechaColumna = this.obtenerFechaReal(nombreDiaColumna);
    return usuario.turnos.find((t: any) => t.fecha === fechaColumna);
  }

  // ✅ Suma las horas de la columna HRS
calcularTotalHoras(usuario: any): number {
  if (!usuario.turnos || usuario.turnos.length === 0) return 0;
  
  return usuario.turnos.reduce((acc: number, t: any) => {
    // Intenta leer 'duracion_horas' o 'horas'. Asegúrate que coincida con tu JSON
    const h = t.duracion_horas || t.horas || 0;
    return acc + (parseFloat(h) || 0);
  }, 0);
}

  // ✅ Genera la fecha YYYY-MM-DD exacta según el nombre del día
  obtenerFechaReal(nombreDia: string): string {
    const semanaActual = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
    if (!semanaActual) return '';

    const partes = semanaActual.fecha_inicio.split('-'); 
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    
    const indiceDia = this.diasSemana.indexOf(nombreDia);
    if (indiceDia !== -1) {
      fecha.setDate(fecha.getDate() + indiceDia);
    }

    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    
    return `${y}-${m}-${d}`;
  }

  onCambioMes(mesId: any) {
    const mes = this.mesesDisponibles.find(m => m.id == mesId);
    this.semanasDisponibles = mes ? mes.semanas : [];
    if (this.semanasDisponibles.length > 0) {
      this.filters.semana_id = this.semanasDisponibles[0].id;
      this.cargarTurnos();
    }
  }
}