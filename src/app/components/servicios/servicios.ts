import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { ServicioService } from '../../services/servicios'; 
import { Servicio } from '../../interfaces/servicio';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    RouterModule
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

    const servicio: any = {
      nombre: this.form.value.nombre,
      descripcion: this.form.value.descripcion,
      cantidad_pacientes: this.form.value.cantidad_pacientes
    };

    this.loading = true;
    if (this.id !== undefined) {
      this._servicioService.updateServicio(this.id, servicio).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => this.loading = false
      });
    } else {
      this._servicioService.createServicio(servicio).subscribe({
        next: () => this.finalizarOperacion(),
        error: () => this.loading = false
      });
    }
  }

  finalizarOperacion() {
    this.loading = false;
    this.mostrarFormulario = false;
    this.id = undefined;
    this.operacion = 'Registrar';
    this.form.reset({ cantidad_pacientes: 0 });
    this.obtenerServicios();
  }
}