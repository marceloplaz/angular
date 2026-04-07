import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PersonaService } from '../../../services/persona'; 
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-ver-personal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ver-personal.html',
})
export class VerPersonalComponent implements OnInit {
  especialista: any = null;
  cargando: boolean = true; // Iniciamos siempre en true

  constructor(
    private route: ActivatedRoute, 
    private personaService: PersonaService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    // Escuchamos el cambio de parámetros de forma directa
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      
      // PASO 1: Reset total inmediato al detectar cambio de ID
      this.especialista = null;
      this.cargando = true;
      this.cdr.detectChanges(); // Forzamos a que el HTML muestre el spinner YA

      if (id) {
        console.log('Cargando nuevo especialista ID:', id);
        
        // PASO 2: Llamada al servicio
        this.personaService.getEspecialista(id).subscribe({
          next: (data) => {
            console.log('Datos recibidos correctamente:', data);
            this.especialista = data;
            
            // PASO 3: Pequeño retardo para asegurar que la vista se limpie antes de mostrar los nuevos datos
            setTimeout(() => {
              this.cargando = false;
              this.cdr.detectChanges(); // Confirmamos el fin de carga
            }, 150);
          },
          error: (err) => {
            console.error('Error cargando especialista:', err);
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }
}