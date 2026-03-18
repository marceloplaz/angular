import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Para traer los usuarios
import { CategoriasService } from '../../services/categorias'; 
import { environment } from 'src/environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.html',
})
export class CategoriasComponent implements OnInit {
  private http = inject(HttpClient);
  private categoriasService = inject(CategoriasService);
  private apiUrlUsuarios = `${environment.apiUrl}/usuarios`; // Ruta de tus usuarios

  // Arrays de datos
  categorias: any[] = [];
  usuarios: any[] = []; // Aquí guardaremos a todo el personal

  nuevaCat = { 
    nombre: '', 
    nivel: 1, 
    descripcion: '' 
  };

  ngOnInit(): void { 
    this.obtenerCategorias();
    this.obtenerPersonal(); // Traemos a los usuarios al iniciar
  }

  // --- MÉTODOS DE DATOS ---

  obtenerCategorias(): void {
    this.categoriasService.listar().subscribe({
      next: (res: any) => {
        this.categorias = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err: any) => console.error('Error al cargar categorías:', err)
    });
  }

  obtenerPersonal(): void {
    this.http.get<any>(this.apiUrlUsuarios).subscribe({
      next: (res: any) => {
        this.usuarios = res.data || res;
      },
      error: (err: any) => console.error('Error al cargar personal:', err)
    });
  }

  // --- FILTROS LÓGICOS (Getters) ---
  // Estos filtros separan a los usuarios según el categoria_id de tu BD

  get medicos() {
    return this.usuarios.filter(u => u.categoria_id == 1);
  }

  get enfermeras() {
    return this.usuarios.filter(u => u.categoria_id == 2);
  }

  get personalManual() {
    return this.usuarios.filter(u => u.categoria_id == 3);
  }

  // --- MÉTODOS DE ACCIÓN ---

  guardar(): void {
    if (!this.nuevaCat.nombre || !this.nuevaCat.nivel) {
      Swal.fire('Atención', 'Nombre y Nivel son obligatorios', 'warning');
      return;
    }

    this.categoriasService.crear(this.nuevaCat).subscribe({
      next: () => {
        Swal.fire('¡Éxito!', 'Categoría registrada', 'success');
        this.obtenerCategorias();
        this.limpiarFormulario();
      },
      error: (e: any) => Swal.fire('Error', e.error?.message || 'Error al guardar', 'error')
    });
  }

  eliminar(id: number): void {
    Swal.fire({
      title: '¿Eliminar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoriasService.eliminar(id).subscribe({
          next: () => {
            this.obtenerCategorias();
            Swal.fire('Eliminado', 'Registro borrado', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  limpiarFormulario(): void {
    this.nuevaCat = { nombre: '', nivel: 1, descripcion: '' };
  }
}