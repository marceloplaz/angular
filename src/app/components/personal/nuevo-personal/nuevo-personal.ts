import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nuevo-personal',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './nuevo-personal.html',
  styleUrl: './nuevo-personal.scss'
})
export class NuevoPersonalComponent {
  
  // Objeto completo sincronizado con tu base de datos Laravel
  nuevoUsuario = {
    // Datos de Acceso
    email: '',
    password: '',
    
    // Información Personal
    nombre: '',
    genero: 'M',
    ci: '',
    nacionalidad: 'Boliviana',
    telefono: '',
    direccion: '',
    
    // Datos Laborales y Finanzas
    categoria: '',      // Médicos, Enfermera, Administrativo, Manual
    tipo_salario: 'TGN', // TGN, CONTRATO, AISEM
    numero_item: '',    // El ID o número de contrato que mencionaste
    salario: 0
  };

  guardar() {
    // Verificamos en consola que todos los campos se capturen correctamente
    console.log('Datos completos para Laravel:', this.nuevoUsuario);
    
    // Aquí es donde llamaremos a tu servicio de personal
    // this.personalService.crear(this.nuevoUsuario).subscribe(...)
  }
}