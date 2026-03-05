// src/app/components/vacaciones/vacaciones.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-vacaciones',
  standalone: true, // Muy importante para tu proyecto
  imports: [],
  templateUrl: './vacaciones.html',
  styleUrl: './vacaciones.scss'
})
export class VacacionesComponent { } // Este nombre debe coincidir con el de app.routes.ts