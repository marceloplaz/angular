import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Incidencia } from '../../interfaces/incidencia';

// IMPORTANTE: Si el archivo se llama incidencia.service.ts, se importa así:
import { IncidenciaService } from '../../services/incidencia'; 
import { ServicioService } from '../../services/servicios'; 

@Component({
  selector: 'app-incidencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incidencias.html',
  styleUrl: './incidencias.scss'
})
export class IncidenciasComponent implements OnInit {
  listaIncidencias: Incidencia[] = [];
  servicios: any[] = []; 
  cargando: boolean = false;
  mostrarModal: boolean = false;

  nuevaIncidencia: Incidencia = {
    usuario_id: 1, 
    servicio_id: 0,
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    prioridad: 'media',
    estado: 'pendiente'
  };

  constructor(
    private incidenciaService: IncidenciaService, // Ahora sí encontrará el token
    private servicioService: ServicioService 
  ) {}

  ngOnInit() {
    this.cargarDatos();
    this.cargarServicios(); 
  }

  cargarServicios() {
  this.servicioService.getServicios().subscribe({
    next: (res: any) => {
      // Si Laravel devuelve { data: [...] }, guardamos res.data
      // Si devuelve [...] directamente, guardamos res
      if (res && res.data && Array.isArray(res.data)) {
        this.servicios = res.data;
      } else if (Array.isArray(res)) {
        this.servicios = res;
      } else {
        console.error('La respuesta de la API no es un array:', res);
      }
      console.log('Servicios cargados en el array:', this.servicios);
    },
    error: (err) => {
      console.error('Error al conectar con la API de servicios:', err);
    }
  });
}
  cargarDatos() {
    this.cargando = true;
    this.incidenciaService.getIncidencias().subscribe({
      next: (res: Incidencia[]) => {
        this.listaIncidencias = res;
        this.cargando = false;
      },
      error: (err: any) => {
        console.error(err);
        this.cargando = false;
      }
    });
  }

  abrirModal() { this.mostrarModal = true; }
  cerrarModal() { this.mostrarModal = false; }

  guardar() {
    if (this.nuevaIncidencia.servicio_id === 0) {
      alert('Seleccione un servicio');
      return;
    }
    
    this.incidenciaService.crearIncidencia(this.nuevaIncidencia).subscribe({
      next: () => {
        this.cargarDatos();
        this.cerrarModal();
        this.nuevaIncidencia.descripcion = '';
      },
      error: (err: any) => console.error('Error al guardar:', err)
    });
  }
}