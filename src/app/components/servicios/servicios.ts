import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ServicioService } from '../../services/servicios'; 
import { Servicio } from '../../interfaces/servicio';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss'
})
export class ServiciosComponent implements OnInit {
  mostrarFormulario: boolean = false;
  listServicios: Servicio[] = [];
  loading: boolean = false;
  form: FormGroup;
  idSeleccionado: number | undefined;
  operacion: string = 'Registrar';

  constructor(
    private _servicioService: ServicioService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: [''],
      cantidad_pacientes: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.obtenerServicios();
  }
obtenerServicios() {
  this.loading = true;
  this._servicioService.getServicios().subscribe({
    next: (response: any) => {
      // AQUÍ: Debes asignar response.data para que la tabla se llene
      this.listServicios = response.data; 
      this.loading = false;
    },
    error: (e) => {
      this.loading = false;
      console.error('La ruta fallida es: ', e.url);
    }
  });
}

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.form.reset({ cantidad_pacientes: 0 });
    }
  }

  

  // ACCIÓN: ELIMINAR
  eliminarServicio(id: number) {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
      this.loading = true;
      this._servicioService.deleteServicio(id).subscribe(() => {
        this.obtenerServicios();
      });
    }
  }

  // ACCIÓN: PREPARAR EDICIÓN (Cargar datos en el formulario)
  editarServicio(servicio: Servicio) {
    this.operacion = 'Modificar';
    this.idSeleccionado = servicio.id;
    this.mostrarFormulario = true;
    
    // Rellenamos el formulario con los valores actuales
    this.form.setValue({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      cantidad_pacientes: servicio.cantidad_pacientes
    });
  }

  // ACCIÓN: GUARDAR (Sirve para Nuevo y Editar)
  guardarServicio() {
    if (this.form.invalid) return;

    const servicio: Servicio = this.form.value;
    this.loading = true;

    if (this.idSeleccionado !== undefined) {
      // EDITAR
      this._servicioService.updateServicio(this.idSeleccionado, servicio).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => this.loading = false
      });
    } else {
      // REGISTRAR NUEVO
      this._servicioService.createServicio(servicio).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => this.loading = false
      });
    }
  }

  finalizarOperacion() {
    this.loading = false;
    this.mostrarFormulario = false;
    this.idSeleccionado = undefined;
    this.operacion = 'Registrar';
    this.form.reset({ cantidad_pacientes: 0 });
    this.obtenerServicios();
  }

  // ACCIÓN: ASIGNAR PERSONAL (Lógica base)
  asignarPersonal(id: number) {
    console.log('Abriendo asignación para el servicio:', id);
    // Aquí podrías abrir un modal o navegar a una ruta de gestión de personal
  }
}
