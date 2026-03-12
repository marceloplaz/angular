import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PersonaService } from '../../../services/persona'; 

@Component({
  selector: 'app-ver-personal',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './ver-personal.html',
  styleUrls: ['../personal.scss'] 
})
export class VerPersonalComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private _personaService = inject(PersonaService);

  public id_recibido: string | null = null;
  public especialista: any = null;
  public cargando: boolean = true;

  ngOnInit(): void {
    // Capturamos el ID de la URL
    this.id_recibido = this.route.snapshot.paramMap.get('id');
    
    if (this.id_recibido) {
      this.obtenerDatos(Number(this.id_recibido));
    }
  }

  obtenerDatos(id: number): void {
    this.cargando = true;
    this._personaService.getPersona(id).subscribe({
      next: (res: any) => {
        // Según tu consola, el objeto viene directo o dentro de .data
        this.especialista = res.data ? res.data : res;
        
        // IMPORTANTE: Esto apaga el mensaje "Cargando expediente..."
        this.cargando = false; 
        
        console.log("Datos cargados exitosamente:", this.especialista);
      },
      error: (err) => {
        console.error("Error en la petición:", err);
        this.cargando = false;
        alert("No se pudo conectar con el servidor para obtener el expediente.");
      }
    });
  }
}