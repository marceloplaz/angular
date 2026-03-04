import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth'; // <--- IMPORTA TU SERVICIO

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService); // <--- INYECTA EL SERVICIO

  // Variables para el formulario
  loginData = {
    email: '',
    password: ''
  };

onLogin(event: Event) {
  event.preventDefault();

  // 1. Usamos .login() (el nombre real en tu AuthService)
  this.authService.login(this.loginData).subscribe({
    next: (res: any) => {
      // 2. Si tu AuthService ya hace el localStorage.setItem en el 'tap',
      // esta línea aquí es opcional, pero asegúrate de usar el nombre correcto:
      if(res.access_token) {
        localStorage.setItem('token', res.access_token); 
      }
      
      console.log('Login exitoso en bd_proyecto_backend');
      this.router.navigate(['/dashboard']);
    },
    error: (err) => {
      console.error('Error 401 en el login:', err);
      alert('Credenciales incorrectas o error de conexión');
    }
  });
}
}