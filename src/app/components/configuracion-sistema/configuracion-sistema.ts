import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { ToastrService } from 'ngx-toastr';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select'; 
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog'; 


@Component({
  selector: 'app-configuracion-sistema',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, CardModule, 
    CheckboxModule, DividerModule, SelectModule, InputTextModule, 
    IconFieldModule, InputIconModule, DialogModule
  ],
  templateUrl: './configuracion-sistema.html',
  styleUrls: ['./configuracion-sistema.scss']
})


export class ConfiguracionSistemaComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private toastr = inject(ToastrService);

  servicios = signal<any[]>([]);
  turnosDisponibles = signal<any[]>([]);
  turnosSeleccionadosIds = signal<number[]>([]); // Este array controla los checks
  servicioIdSeleccionado = signal<number | null>(null);
  cargando = signal<boolean>(false);
  objetosSeleccionados: any[] = [];
  mostrarModalCrear = signal<boolean>(false);
  nuevoTurno = signal({
    nombre_turno: '',
    hora_inicio: '',
    hora_fin: '',
    
    duracion_horas: 0
  });

 constructor() {
  effect(() => {
    // Extraemos los valores para que el effect sepa qué "escuchar"
    const turnoActual = this.nuevoTurno();
    const inicio = turnoActual.hora_inicio;
    const fin = turnoActual.hora_fin;

    if (inicio && fin) {
      const duracion = this.calcularDiferenciaHoras(inicio, fin);
      
      // Solo actualizamos si la duración es distinta a la que ya tiene
      // para evitar ciclos de renderizado innecesarios
      if (duracion !== turnoActual.duracion_horas) {
        this.nuevoTurno.update(state => ({
          ...state,
          duracion_horas: duracion
        }));
      }
    }
  }, { allowSignalWrites: true });
}

onHoraChange() {
    const inicio = this.nuevoTurno().hora_inicio;
    const fin = this.nuevoTurno().hora_fin;

    if (inicio && fin) {
      const duracion = this.calcularDiferenciaHoras(inicio, fin);
      this.nuevoTurno.update(state => ({
        ...state,
        duracion_horas: duracion
      }));
    }
  } 

  ngOnInit() {
    this.obtenerDatosIniciales();
  }

  obtenerDatosIniciales() {
    // 1. Cargamos el catálogo general (No marca nada por defecto)
    this.turnoService.getTurnos({}).subscribe((res: any) => {
      this.turnosDisponibles.set(res.data || res);
    });

    // 2. Cargamos los servicios pero NO seleccionamos ninguno automáticamente
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios.set(res.data || res);
      this.servicioIdSeleccionado.set(null); // Iniciamos en nulo
      this.turnosSeleccionadosIds.set([]);   // Garantizamos tabla limpia
    });
  }

 
  
  actualizarIdsDesdeObjetos(event: any[]) {
  // Extraemos los IDs de los objetos seleccionados para tu Signal
  const ids = event.map(turno => turno.id);
  this.turnosSeleccionadosIds.set(ids);
}
 cargarConfiguracionActual() {
  const id = this.servicioIdSeleccionado();
  
  // Limpiamos ambos estados para que la tabla inicie vacía
  this.objetosSeleccionados = [];
  this.turnosSeleccionadosIds.set([]); 

  if (!id) return;
  
  this.turnoService.getTurnosPorServicio(id).subscribe((res: any) => {
    const data = res.data || res;
    // Sincronizamos la selección visual (objetos) y la lógica (ids)
    this.objetosSeleccionados = data;
    this.turnosSeleccionadosIds.set(data.map((t: any) => t.id));
  });
}

  limpiarSeleccion() {
    this.turnosSeleccionadosIds.set([]);
    this.toastr.info("Selección reiniciada");
  }

  guardar() {
    if (!this.servicioIdSeleccionado()) return;
    this.cargando.set(true);
    const payload: any =  {
      servicio_id: this.servicioIdSeleccionado(),
      turnos_ids: this.turnosSeleccionadosIds()
    };
    this.turnoService.vincularTurnosAServicio(payload).subscribe({
      next: () => {
        this.toastr.success("Configuración guardada");
        this.cargando.set(false);
      },
      error: () => {
        this.toastr.error("Error al guardar");
        this.cargando.set(false);
      }
    });
  }

abrirModalNuevoTurno() {
    this.nuevoTurno.set({
      nombre_turno: '',
      hora_inicio: '',
      hora_fin: '',
      duracion_horas: 0
    });
    this.mostrarModalCrear.set(true);
  }

 private calcularDiferenciaHoras(inicio: string, fin: string): number {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);

  let totalInicio = h1 * 60 + m1;
  let totalFin = h2 * 60 + m2;

  // Si el fin es menor al inicio, sumamos 24 horas
  if (totalFin <= totalInicio) {
    totalFin += 24 * 60;
  }

  const diferenciaMinutos = totalFin - totalInicio;
  
  // Usamos Math.ceil o Math.round según prefieras
  return Math.round(diferenciaMinutos / 60);
}

  guardarNuevoTurno() {
    const data = this.nuevoTurno();
    
    if (!data.nombre_turno || !data.hora_inicio || !data.hora_fin) {
      this.toastr.warning("Complete todos los campos obligatorios");
      return;
    }

    this.cargando.set(true);
    this.turnoService.crearTurno(data).subscribe({
      next: () => {
        this.toastr.success("Turno creado exitosamente");
        this.mostrarModalCrear.set(false);
        this.obtenerDatosIniciales(); // Recargar catálogo
        this.cargando.set(false);
      },
      error: (err) => {
        this.toastr.error("Error al registrar el turno");
        this.cargando.set(false);
      }
    });
  }

}