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

 this.authService.login(this.loginData).subscribe({
  next: (res: any) => {
    if(res.access_token) {
      localStorage.setItem('token', res.access_token); 
      
      // Ajustamos para que lea 'nombre_usuario' del Resource de Laravel
      const nombreReal = res.user?.nombre_usuario || 'Usuario';
      localStorage.setItem('usuario_nombre', nombreReal);
      
      console.log('Nombre guardado correctamente:', nombreReal);
    }
    this.router.navigate(['/dashboard']);
  },
  error: (err) => {
    alert('Credenciales incorrectas');
  }
});

}
}