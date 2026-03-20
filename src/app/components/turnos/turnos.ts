import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno'; // Asegura que la ruta sea correcta
@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html' // <--- Asegúrate de que termine en .html
})
export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);

  // Datos dinámicos desde el Backend
  servicios: any[] = [];
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  
  // Filtros vinculados al HTML
  filtro = { 
    servicio_id: null as any, 
    anio: 2026, 
    mes_id: null as any, 
    semana_id: null as any 
  };

  // Estructura de la tabla
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  personalAgrupado: any[] = []; // Cambiado de 'medicos' a estructura jerárquica
  cargando: boolean = false;

  // Modal de Asignación
  mostrarModal = false;
  medicoSeleccionado: any = null;
  diaSeleccionado: string = '';
  tipoTurnoSeleccionado: number = 1;

  ngOnInit() {
    this.cargarConfiguracionInicial();
  }
cargarConfiguracionInicial() {
  // 1. Cargar Servicios
  this.turnoService.getServicios().subscribe((res: any) => {
    // ACCESO CORRECTO: res.data es el arreglo
    this.servicios = res.data; 
    
    if (this.servicios && this.servicios.length > 0) {
      this.filtro.servicio_id = this.servicios[0].id;
      // Una vez tenemos el servicio, cargamos el personal
      this.cargarTurnos(); 
    }
  });

  // 2. Cargar Calendario (Asegúrate de que res.gestiones sea un array)
  this.turnoService.getConfiguracionCalendario().subscribe((res: any) => {
    const data = res.data || res;
    const gestionActual = data.gestiones?.find((g: any) => g.año == 2026);
    if (gestionActual) {
      this.mesesDisponibles = gestionActual.meses;
      const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual);
      if (mesActual) {
        this.filtro.mes_id = mesActual.id;
        this.semanasDisponibles = mesActual.semanas;
        if (this.semanasDisponibles.length > 0) {
          this.filtro.semana_id = this.semanasDisponibles[0].id;
        }
      }
    }
  });
}
  /**
   * Carga servicios y la configuración del calendario (2026)
   */


  cargarCalendario() {
    this.turnoService.getConfiguracionCalendario().subscribe((res: any) => {
      const data = res.data || res; // Manejo de envoltura de API
      const gestionActual = data.gestiones.find((g: any) => g.año == 2026);
      
      if (gestionActual) {
        this.mesesDisponibles = gestionActual.meses;
        this.filtro.anio = 2026;

        // Intentar seleccionar el mes actual del backend o el primero disponible
        const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
        
        if (mesActual) {
          this.filtro.mes_id = mesActual.id;
          this.semanasDisponibles = mesActual.semanas;
          if (this.semanasDisponibles.length > 0) {
            this.filtro.semana_id = this.semanasDisponibles[0].id;
            this.cargarTurnos(); // Carga final de la tabla
          }
        }
      }
    });
  }

  onCambioMes(mesId: any) {
    const mes = this.mesesDisponibles.find(m => m.id == mesId);
    this.semanasDisponibles = mes ? mes.semanas : [];
    if (this.semanasDisponibles.length > 0) {
      this.filtro.semana_id = this.semanasDisponibles[0].id;
      this.cargarTurnos();
    }
  }

  /**
   * Carga el personal organizado por categorías (Médicos, Enfermería, etc.)
   */
 // src/app/components/turnos/turnos.ts

// src/app/components/turnos/turnos.ts

cargarTurnos() {
  if (!this.filtro.servicio_id) return;
  
  this.cargando = true;
  // Llamada al servicio pasando el ID del selector (ej: HEMODIALISIS)
  this.turnoService.getEquipoPorJerarquia(this.filtro.servicio_id).subscribe({
    next: (res: any) => {
      // Tu API devuelve 'equipo_visible'
      this.personalAgrupado = res.equipo_visible || []; 
      this.cargando = false;
      
      // LOG para verificar en consola qué llegó exactamente
      console.log("Personal recibido para servicio " + this.filtro.servicio_id + ":", this.personalAgrupado);
    },
    error: (err) => {
      console.error('Error en la petición:', err);
      this.cargando = false;
    }
  });
}

  abrirModalAsignar(medico: any, dia: string) {
    this.medicoSeleccionado = medico;
    this.diaSeleccionado = dia;
    this.mostrarModal = true;
  }

  guardarTurno() {
    const payload = {
      usuario_id: this.medicoSeleccionado.id,
      turno_id: this.tipoTurnoSeleccionado,
      fecha: this.diaSeleccionado,
      semana_id: this.filtro.semana_id
    };

    this.turnoService.asignarTurno(payload).subscribe(() => {
      this.mostrarModal = false;
      this.cargarTurnos(); // Recargar tabla para ver el nuevo turno
    });
  }
}