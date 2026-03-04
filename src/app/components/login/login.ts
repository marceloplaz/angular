import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // <--- 1. IMPORTA ESTO

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], // <--- 2. AÑÁDELO AQUÍ
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private router = inject(Router);

  onLogin(event: Event) {
  event.preventDefault();
  
  // Guardamos un token ficticio para engañar al Guard por ahora
  localStorage.setItem('token', 'sesion-activa-hospital');
  
  console.log('Navegando al dashboard...');
  this.router.navigate(['/dashboard']);
}
}