import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {
  private router = inject(Router);
  
  public usuario: string = 'jugadordeunbit'; // Tu alias de sistema
  public sidebarVisible: boolean = true;

  // Opción A: Definir la variable para que el HTML no falle
  public listaPersonas: any[] = []; 

  // Opción B: Función para saber si estamos en la "raíz" del dashboard
  esInicio(): boolean {
    return this.router.url === '/dashboard';
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}