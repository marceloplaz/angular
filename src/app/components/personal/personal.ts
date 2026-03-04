import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonaService } from '../../services/persona';
import { Persona } from '../../interfaces/persona';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personal.html' 
})
export class PersonalComponent implements OnInit {
  private personaService = inject(PersonaService);
  
  // Lista donde se guardan los 24 registros detectados
  public listaPersonas: Persona[] = [];

  ngOnInit(): void {
    this.obtenerPersonal();
  }

  obtenerPersonal(): void {
    this.personaService.getPersonas().subscribe({
      next: (res: any) => {
        // Laravel Paginate devuelve los registros en la propiedad 'data'
        this.listaPersonas = res.data; 
        console.log('Datos cargados desde bd_proyecto_backend');
      },
      error: (err: any) => {
        console.error('Error al conectar con el backend', err);
      }
    });
  }

  // FUNCIÓN PARA EL BOTÓN PDF
  generarReporte(id: number | undefined): void {
    if (!id) return;
    console.log('Generando reporte PDF para la persona con ID:', id);
    // Aquí llamarás a tu servicio de PDF más adelante
  }

  // FUNCIÓN PARA EL BOTÓN EDITAR
  abrirEdicion(persona: Persona): void {
    console.log('Editando a:', persona.nombre_completo);
    // Aquí abrirás tu modal o formulario de edición
  }
}