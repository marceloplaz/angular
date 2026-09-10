import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AsistenciaService } from '../../services/asistencia'; 
import { AsistenciaRegistro } from '../../interfaces/asistencia'; 

@Component({
  selector: 'app-asistencia',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.scss'
})
export class AsistenciaComponent {
  private asistenciaService = inject(AsistenciaService);

  registros: AsistenciaRegistro[] = [];
  cargando: boolean = false;

  usuarioId: string | number = 17; 
  fechaInicio: string = '2026-02-01';
  fechaFin: string = '2026-02-28';

  buscarAsistencia() {
    // Eliminamos espacios en blanco al inicio o final
    const idLimpio = String(this.usuarioId).trim();

    if (!idLimpio || !this.fechaInicio || !this.fechaFin) {
      console.warn('Faltan datos obligatorios para la búsqueda');
      return;
    }

    this.cargando = true;

    // Convertimos a número antes de enviar al servicio
    const idNumerico = Number(idLimpio);

    this.asistenciaService.obtenerReporteRango(idNumerico, this.fechaInicio, this.fechaFin)
      .pipe(
        finalize(() => {
          this.cargando = false; 
        })
      )
      .subscribe({
        next: (response: any) => {
          this.registros = response?.data || [];
        },
        error: (err) => {
          console.error('Error al obtener asistencia:', err);
          this.registros = [];
        }
      });
  }
  }