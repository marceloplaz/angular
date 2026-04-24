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
  terminoBusqueda: string = '';
  resultadosBusqueda: any[] = [];
  buscandoProfesional: boolean = false;
  cargoSeleccionado: string = 'personal_planta';
  usuarioParaVincular: any = null;
  estadoSeleccionado: number = 1;

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

  seleccionarUsuario(user: any) {
  this.usuarioParaVincular = user;
  this.terminoBusqueda = user.persona?.nombre_completo || user.name;
  this.resultadosBusqueda = []; // Cerramos la lista al seleccionar
}

  ejecutarBusqueda() {
    if (this.terminoBusqueda.length < 3) {
      this.resultadosBusqueda = [];
      return;
    }

    this._servicioService.buscarProfesionales(this.terminoBusqueda).subscribe({
      next: (res: any) => {
        this.resultadosBusqueda = res;
      },
      error: (e) => console.error('Error en búsqueda:', e)
    });
  }

  confirmarVinculacionManual() {
  if (!this.usuarioParaVincular) {
    this.toastr.warning('Seleccione un profesional de la lista');
    return;
  }
  this.confirmarVinculacion(this.usuarioParaVincular);
}


// Añadimos el "?" para que sea opcional y manejamos ambos casos
confirmarVinculacion(usuario?: any) {
  // 1. Si pasamos un usuario (clic en el + verde), usamos ese.
  // 2. Si no pasamos nada (clic en botón azul), usamos el que guardamos al seleccionar.
  const user = usuario || this.usuarioParaVincular;

  if (!user) {
    this.toastr.warning('Por favor, seleccione un profesional de la lista', 'Atención');
    return;
  }

  if (!this.servicioSeleccionado) return;

  const datos = {
    usuario_id: user.id,
    servicio_id: this.servicioSeleccionado.id,
    cargo: this.cargoSeleccionado
  };

  this.loading = true;
  this._servicioService.vincularProfesional(datos).subscribe({
    next: () => {
      this.toastr.success('Personal vinculado correctamente', 'Éxito');
      this.limpiarBuscador(); // Función para limpiar campos
      this.verDetalles(this.servicioSeleccionado); // Recarga la tabla de la derecha
    },
    error: (err) => {
      this.loading = false;
      this.toastr.error('Error al vincular: el usuario ya existe en este servicio', 'Error');
    }
  });
  
}



// Función auxiliar para limpiar después del éxito
limpiarBuscador() {
  this.terminoBusqueda = '';
  this.resultadosBusqueda = [];
  this.usuarioParaVincular = null;
  this.loading = false;
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
vincularDirecto(usuario: any) {
    if (!this.servicioSeleccionado) {
      console.error("No hay un servicio seleccionado para vincular");
      return;
    }

    // Generamos la fecha actual en formato YYYY-MM-DD exigido por el backend
    const fechaHoy = new Date().toISOString().split('T')[0];

    const payload = {
      usuario_id: usuario.id,
      servicio_id: this.servicioSeleccionado.id,
      descripcion: this.cargoSeleccionado,
      estado: this.estadoSeleccionado,
      fecha_ingreso: fechaHoy // <--- Esto elimina el error de validación
    };

    // Llamada al servicio (ajusta el nombre según tu _servicioService)
    this._servicioService.vincularUsuario(payload).subscribe({
      next: (res: any) => {
        // 1. Limpiar el buscador
        this.terminoBusqueda = '';
        this.resultadosBusqueda = [];
        
        // 2. Refrescar los datos del servicio para ver al nuevo integrante en la tabla
        this.verDetalles(this.servicioSeleccionado);
        
        // 3. Notificación de éxito
        this.toastr.success('Personal vinculado con éxito');
      },
      error: (err: any) => {
        console.error("Error al vincular:", err);
        this.toastr.error('Error: ' + (err.error.message || 'No se pudo vincular'));
      }
    });
  }
}


