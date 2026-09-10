import { Component, inject, OnInit } from '@angular/core';
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
export class AsistenciaComponent implements OnInit {
  private asistenciaService = inject(AsistenciaService);

  registros: AsistenciaRegistro[] = [];
  cargando: boolean = false;

  // Dejamos el ID vacío por defecto para consultar a todos los funcionarios
  usuarioId: string | number = ''; 
  fechaInicio: string = '2026-02-01';
  fechaFin: string = '2026-02-28';

  ngOnInit() {
    // Al entrar al componente se lista automáticamente a todo el personal con retrasos/permisos
    this.buscarAsistencia();
  }

// En tu método buscarAsistencia() de asistencia.ts
buscarAsistencia() {
  if (!this.fechaInicio || !this.fechaFin) {
    console.warn('Las fechas son obligatorias');
    return;
  }

  this.cargando = true;

  const idLimpio = String(this.usuarioId).trim();
  // Usamos undefined en lugar de null si no hay ID
  const idParametro = idLimpio !== '' ? Number(idLimpio) : undefined;

  // Si el servicio no acepta undefined, fuerza el casteo con (idParametro as any)
  this.asistenciaService.obtenerReporteRango(idParametro as any, this.fechaInicio, this.fechaFin)
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