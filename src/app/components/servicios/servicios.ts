import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { ServicioService } from '../../services/servicios'; 
import { Servicio } from '../../interfaces/servicio';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { bootstrapApplication } from '@angular/platform-browser';

declare var bootstrap: any;

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterModule, 
    
  ],
  templateUrl: './servicios.html',
  styleUrl: './servicios.scss'
})
export class ServiciosComponent implements OnInit {
  mostrarFormulario: boolean = false;
  listServicios: Servicio[] = [];
  loading: boolean = false;
  form: FormGroup;
  id: number | undefined;
  operacion: string = 'Registrar';
  servicioSeleccionado: any = null;

  constructor(
    private _servicioService: ServicioService,
    private toastr: ToastrService,
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
        this.listServicios = response.data; 
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        console.error('Error al cargar servicios: ', e);
      }
    });
  }

  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) {
      this.form.reset({ cantidad_pacientes: 0 });
      this.operacion = 'Registrar';
      this.id = undefined;
    }
  }

  eliminarServicio(id: number) {
    if (confirm('¿Está seguro de eliminar este servicio?')) {
      this.loading = true;
      this._servicioService.deleteServicio(id).subscribe(() => {
        this.obtenerServicios();
      });
    }
  }

  editarServicio(servicio: Servicio) {
    this.id = servicio.id;
    this.operacion = 'Editar';
    this.mostrarFormulario = true;
    this.form.patchValue({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      cantidad_pacientes: servicio.cantidad_pacientes
    });
  }

  guardarServicio() {
  if (this.form.invalid) return;

  const servicio = this.form.value;
  this.loading = true;

  const request = (this.id !== undefined) 
    ? this._servicioService.updateServicio(this.id, servicio)
    : this._servicioService.createServicio(servicio);

  request.pipe(
    finalize(() => this.loading = false) // Esto apaga el spinner SIEMPRE
  ).subscribe({
    next: () => {
      this.toastr.success(`Servicio ${this.operacion === 'Editar' ? 'actualizado' : 'creado'}`, 'Éxito');
      this.finalizarOperacion();
    },
    error: (e) => {
      console.error(e);
      this.toastr.error('Ocurrió un error en el servidor', 'Error');
    }
  });
}



  finalizarOperacion() {
    this.loading = false;
    this.mostrarFormulario = false;
    this.id = undefined;
    this.operacion = 'Registrar';
    this.form.reset({ cantidad_pacientes: 0 });
    this.obtenerServicios();
  }
verDetalles(servicio: any) {
  this.loading = true;
  this._servicioService.getServicio(servicio.id).subscribe({
    next: (res) => {
      this.servicioSeleccionado = res.data;
      this.loading = false;

      const modalElement = document.getElementById('detalleServicioModal');
      if (modalElement) {
        // 1. Intentamos obtener una instancia existente
        let modalInstance = bootstrap.Modal.getInstance(modalElement);
        
        // 2. Si no existe, la creamos UNA sola vez
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalElement);
        }
        
        // 3. Mostramos el modal
        modalInstance.show();
      }
    },
    error: (e) => {
      this.loading = false;
      console.error(e);
    }
  });
}

abrirAsignacion() {
  const modalElement = document.getElementById('detalleServicioModal');
  if (modalElement) {
     const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }
  
  this.operacion = 'Asignar';
  // Aquí puedes poner la lógica para abrir el siguiente modal de búsqueda
  console.log("Cerrando detalle y abriendo asignación para:", this.servicioSeleccionado?.nombre);
}

}

