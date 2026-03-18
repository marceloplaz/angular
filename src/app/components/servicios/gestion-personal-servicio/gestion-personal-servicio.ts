import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gestion-personal-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './gestion-personal-servicio.html',
  styleUrl: './gestion-personal-servicio.scss'
})
export class GestionPersonalServicioComponent implements OnInit {
  servicioId!: number;
  servicioInfo: any = null;
  nomina: any[] = []; // Solo una vez
  loading: boolean = false; // Agregada para evitar errores
  
  busquedaPersona: string = '';
  resultadosBusqueda: any[] = [];
  personaSeleccionada: any = null;
  cargoRol: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.servicioId = Number(this.route.snapshot.paramMap.get('id'));
    this.obtenerDatosIniciales();
  }

  obtenerDatosIniciales() {
    this.http.get(`${environment.apiUrl}/servicios/${this.servicioId}`).subscribe({
      next: (res: any) => {
        this.servicioInfo = res.data;
        this.obtenerNomina(); 
      },
      error: (e) => console.error('Error cargando servicio:', e)
    });
  }

  buscarProfesional() {
    if (this.busquedaPersona.length > 2) {
      this.http.get(`${environment.apiUrl}/persona?buscar=${this.busquedaPersona}`)      
        .subscribe((res: any) => this.resultadosBusqueda = res.data);
    } else {
      this.resultadosBusqueda = [];
    }
  }

seleccionarPersona(p: any) {
  this.personaSeleccionada = p;
  this.busquedaPersona = p.nombre_completo;
  this.resultadosBusqueda = [];
  
  // Debug para confirmar que capturas el ID de la tabla users (ej: 9, 10, 13)
  console.log("ID de usuario para la tabla usuario_servicios:", p.usuario_id);
}

vincular() {
  const hoy = new Date().toISOString().split('T')[0];

  const datos = {
    usuario_id: this.personaSeleccionada.usuario_id, // Usamos el ID de la tabla users
    servicio_id: this.servicioId,
    fecha_ingreso: hoy,
    descripcion_usuario_servicio: this.cargoRol || 'Sin cargo especificado',
    estado: 1
  };

  this.http.post(`${environment.apiUrl}/usuario-servicio`, datos).subscribe({
    next: () => {
        Swal.fire('¡Éxito!', 'Personal vinculado', 'success');
        this.obtenerNomina();
    },
    error: (e) => {
        console.error("Error 422:", e.error);
        Swal.fire('Error', 'Verifica que el usuario_id se esté enviando', 'error');
    }
  });
}





 obtenerNomina() {
  this.loading = true;
  
  // Cambiado de 'usuario-servicios' a 'usuario-servicio' (singular)
  this.http.get(`${environment.apiUrl}/usuario-servicio?servicio_id=${this.servicioId}`).subscribe({
    next: (res: any) => {
      this.nomina = res.data;
      this.loading = false;
    },
    error: (e) => {
      this.loading = false;
      console.error('Error al obtener la nómina:', e);
    }
  });
}


  desvincular(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "El profesional ya no aparecerá en la nómina de este servicio.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, desvincular'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${environment.apiUrl}/usuario-servicio/${id}`).subscribe({
          next: () => {
            Swal.fire('¡Desvinculado!', 'Eliminado con éxito', 'success');
            this.obtenerNomina();
          },
          error: (e) => console.error(e)
        });
      }
    });
  }

  limpiarForm() {
    this.personaSeleccionada = null;
    this.busquedaPersona = '';
    this.cargoRol = '';
  }
}