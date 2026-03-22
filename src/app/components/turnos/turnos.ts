import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html'
})
export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);

  // Listas para los combos
  servicios: any[] = [];
  categorias: any[] = [];
  equipoVisible: any[] = []; // Aquí guardaremos 'equipo_visible'
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  
  // Objeto de filtros unificado
  filters = { 
    servicio_id: null as any, 
    categoria_id: '' as any,
    gestion: 2026, 
    mes_id: null as any, 
    semana_id: null as any 
  };

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  personalAgrupado: any[] = []; 
  cargando: boolean = false;

  // Variables para el Modal
  mostrarModal = false;
  medicoSeleccionado: any = null;
  diaSeleccionado: string = '';

  ngOnInit() {
    this.cargarConfiguracionInicial();

  }

  cargarConfiguracionInicial() {
    // 1. Cargar Servicios
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios = res.data; 
      if (this.servicios?.length > 0) {
        this.filters.servicio_id = this.servicios[0].id;
        this.cargarCategorias(); 
      }
    });

    // 2. Cargar Calendario (Gestión)
    this.turnoService.getConfiguracionCalendario().subscribe((res: any) => {
      const data = res.data || res;
      // CORRECCIÓN: Usamos gestion para buscar en la data del servidor
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
      }
    });
  }

  cargarCategorias() {
   this.turnoService.getCategorias().subscribe({
  next: (res: any) => {
    // IMPORTANTE: Acceder a .data que es lo que envía tu Laravel
    this.categorias = res.data; 
    console.log('Categorías cargadas:', this.categorias);
  },
  error: (err) => console.error('Error cargando categorías', err)
});
  }

  onFilterChange() {
    this.personalAgrupado = [];
    this.cargarTurnos();
  }

  cargarTurnos() {
 
    if (!this.filters.servicio_id) return;

    this.cargando = true;
// Llamamos a tu servicio con los filtros actuales
    this.turnoService.getEquipoPorFiltros(this.filters.servicio_id, this.filters.categoria_id)
      .subscribe({
        next: (res: any) => {
          // MAPEO CRÍTICO: Aquí asignamos 'equipo_visible' a 'personalAgrupado'
          // para que coincida con lo que vimos en tu consola de red.
          this.personalAgrupado = res.equipo_visible || [];
          this.cargando = false;
          console.log("Personal cargado en tabla:", this.personalAgrupado);
        },
        error: (err) => {
          console.error("Error cargando turnos:", err);
          this.cargando = false;
          this.personalAgrupado = [];
        }
      });
  }

  onCambioMes(mesId: any) {
    const mes = this.mesesDisponibles.find(m => m.id == mesId);
    this.semanasDisponibles = mes ? mes.semanas : [];
    if (this.semanasDisponibles.length > 0) {
      this.filters.semana_id = this.semanasDisponibles[0].id;
      this.cargarTurnos();
    }
  }

  // MÉTODO QUE FALTABA
  abrirModalAsignar(personal: any, dia: string) {
    this.medicoSeleccionado = personal;
    this.diaSeleccionado = dia;
    this.mostrarModal = true;
    console.log('Asignando a:', personal.usuario_nombre, 'Día:', dia);
  }
}