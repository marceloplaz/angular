import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// CORRECCIÓN: La ruta debe coincidir con el nombre del archivo físico
import { CategoriasService } from '../../services/categorias'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.html',
})
export class CategoriasComponent implements OnInit {
  categorias: any[] = [];
  nuevaCat = { 
    nombre: '', 
    nivel: 1, 
    descripcion: '' 
  };

  private categoriasService = inject(CategoriasService);

  ngOnInit(): void { 
    this.obtenerCategorias(); 
  }

  obtenerCategorias(): void {
    this.categoriasService.listar().subscribe({
      next: (res: any) => {
        // Maneja tanto si Laravel devuelve el array directo o en .data
        this.categorias = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err: any) => {
        console.error('Error al cargar categorías:', err);
        if (err.status === 403) {
          Swal.fire('Acceso Denegado', 'No tienes permiso admin_system.', 'error');
        }
      }
    });
  }

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
      error: (e: any) => {
        Swal.fire('Error', e.error?.message || 'Error al guardar', 'error');
      }
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