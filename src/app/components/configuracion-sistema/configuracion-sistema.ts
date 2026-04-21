import { Component, OnInit, signal, inject } from '@angular/core'; // Añadido inject
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// --- SERVICIOS ---
import { TurnoService } from '../../services/turno'; // Ajusta la ruta a tu proyecto
import { ToastrService } from 'ngx-toastr';

// --- IMPORTACIONES DE PRIMENG ---
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select'; 
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-configuracion-sistema',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './configuracion-sistema.html',
  styleUrls: ['./configuracion-sistema.scss']
})

export class ConfiguracionSistemaComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private toastr = inject(ToastrService);

  // Signals para manejar el estado de forma eficiente
  servicios = signal<any[]>([]);
  turnosDisponibles = signal<any[]>([]);
  turnosSeleccionadosIds = signal<number[]>([]);
  servicioIdSeleccionado = signal<number | null>(null);
  cargando = signal<boolean>(false);

  ngOnInit() {
    this.obtenerDatosIniciales();
  }

  obtenerDatosIniciales() {
    // Cargamos los servicios para el select
this.turnoService.getServicios().subscribe((res: any) => { 
  const data = res.data || res;
  this.servicios.set(data);
  if (data.length > 0) {
    this.servicioIdSeleccionado.set(data[0].id);
    this.cargarConfiguracionActual();
  }
});

    // 2. Cargamos todos los turnos existentes en el sistema
    this.turnoService.getTurnos({}).subscribe(res => {
      this.turnosDisponibles.set(res.data || res);
    });
  }

  limpiarSeleccion() {
  // Al ser un Signal, seteamos un array vacío y la tabla se desmarcará sola
  this.turnosSeleccionadosIds.set([]);
  this.toastr.info("Selección limpiada");
}
  // Se ejecuta al cambiar el servicio en el combo
  cargarConfiguracionActual() {
    if (!this.servicioIdSeleccionado()) return;
    
    this.turnoService.getTurnosPorServicio(this.servicioIdSeleccionado()!).subscribe(res => {
      // Extraemos solo los IDs para que el p-checkbox sepa cuáles marcar
      const ids = res.data.map((t: any) => t.id);
      this.turnosSeleccionadosIds.set(ids);
    });
  }

 guardar() {
    const idActual = this.servicioIdSeleccionado();
    if (!idActual) {
      this.toastr.warning("Por favor seleccione un servicio");
      return;
    }

    // Usamos 'cargando' porque así se llama tu Signal arriba
    this.cargando.set(true);

    const payload = {
      servicio_id: idActual,
      // Usamos 'turnosSeleccionadosIds' porque así lo declaraste
      turnos_ids: this.turnosSeleccionadosIds()
    };

    this.turnoService.vincularTurnosAServicio(payload).subscribe({
      next: () => {
        this.toastr.success("Configuración actualizada con éxito");
        this.cargando.set(false);
      },
      error: () => {
        this.toastr.error("Error al guardar la configuración");
        this.cargando.set(false);
      }
    });
  }
}