import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- IMPORTANTE: Esto arregla el error de ngClass
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ServicioService } from '../../../services/servicios'; // Verifica que la ruta sea correcta
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gestion-personal-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // <--- Debe estar CommonModule aquí
  templateUrl: './gestion-personal-servicio.html',
  styleUrl: './gestion-personal-servicio.scss' // <--- CORREGIDO: Quité la 's' extra al final
})
export class GestionPersonalServicioComponent implements OnInit {
  servicioId!: number;
  servicioInfo: any = null;
  nomina: any[] = [];
  busquedaPersona: string = '';
  resultadosBusqueda: any[] = [];
  personaSeleccionada: any = null;
  cargoRol: string = '';
 
  constructor(
    private route: ActivatedRoute,
    private _servicioService: ServicioService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.servicioId = Number(idParam);
      this.obtenerDatosIniciales();
    }
  }

  
  obtenerDatosIniciales() {
  this._servicioService.getServicio(this.servicioId).subscribe({
    next: (res: any) => {
      // IMPORTANTE: Laravel Resource envuelve todo en 'data'
      if (res && res.data) {
        this.servicioInfo = res.data;
        
        // Aquí es donde ocurre la magia:
        // 'usuarios' viene del ServicioResource que creamos en PHP
        this.nomina = res.data.usuarios || []; 
        
        console.log('Nómina cargada con éxito:', this.nomina);
      }
    },
    error: (err) => {
      console.error('Error al cargar la nómina:', err);
    }
  });
}

  buscarProfesional(): void {
    if (this.busquedaPersona.length > 2) {
      this._servicioService.buscarProfesionales(this.busquedaPersona).subscribe({
        next: (res: any) => this.resultadosBusqueda = res.data || [],
        error: (err: any) => console.error(err)
      });
    } else {
      this.resultadosBusqueda = [];
    }
  }

  seleccionarPersona(u: any): void {
    this.personaSeleccionada = u;
    this.busquedaPersona = u.persona?.nombre_completo || u.name;
    this.resultadosBusqueda = [];
  }

  vincular(): void {
    if (!this.personaSeleccionada) return;

    const datos = {
      usuario_id: this.personaSeleccionada.id,
      servicio_id: this.servicioId,
      fecha_ingreso: new Date().toISOString().split('T')[0],
      descripcion_usuario_servicio: this.cargoRol || 'Integrante',
      estado: 1
    };

    this._servicioService.vincularProfesional(datos).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Personal vinculado', 'success');
        this.personaSeleccionada = null;
        this.busquedaPersona = '';
        this.cargoRol = '';
        this.obtenerDatosIniciales();
      },
      error: (err: any) => Swal.fire('Error', 'No se pudo vincular', 'error')
    });
  }

  // <--- ESTA ES LA FUNCIÓN QUE TE FALTABA (Arregla error TS2339)
  desvincular(id: number): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Se quitará al profesional de este servicio",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this._servicioService.desvincularProfesional(id).subscribe({
          next: () => {
            this.obtenerDatosIniciales();
            Swal.fire('Eliminado', 'Personal quitado del servicio', 'success');
          },
          error: (err: any) => console.error(err)
        });
      }
    });
  }
}