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
  private apiUrlUsuarios = `${environment.apiUrl}/usuarios`;

  categorias: any[] = [];
  usuarios: any[] = [];
  loading: boolean = false; // Para feedback visual

  nuevaCat = { nombre: '', nivel: 1, descripcion: '' };

  ngOnInit(): void { 
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    // Ejecutamos ambas peticiones
    this.obtenerCategorias();
    this.obtenerPersonal();
  }

  obtenerCategorias(): void {
    this.categoriasService.listar().subscribe({
      next: (res: any) => {
        this.categorias = Array.isArray(res) ? res : (res.data || []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.loading = false;
      }
    });
  }

  obtenerPersonal(): void {
    this.http.get<any>(this.apiUrlUsuarios).subscribe({
      next: (res: any) => {
        this.usuarios = res.data || res;
        console.log('Lista de usuarios recibida:', this.usuarios);
      }
    });
  }
obtenerUsuariosPorCat(categoriaId: number) {
  const idObjetivo = Number(categoriaId);

  return this.usuarios.filter(u => {
    // 1. Verificamos si el ID está directamente en el usuario (como está Dante en la BD)
    const enUsuario = u.categoria_id ? Number(u.categoria_id) : null;
    
    // 2. Verificamos si por error se guardó dentro del objeto persona
    const enPersona = u.persona?.categoria_id ? Number(u.persona.categoria_id) : null;

    return enUsuario === idObjetivo || enPersona === idObjetivo;
  });
}

  /**
   * Devuelve el color principal según el ID de categoría
   */
  getColor(id: number): string {
    const colors: any = {
      1: '#0d6efd', // Azul (Médicos)
      2: '#198754', // Verde (Enfermeras)
      3: '#f1a100', // Amarillo/Naranja (Manual)
    };
    // Si es una categoría nueva (ID > 3), asigna un color púrpura o gris
    return colors[id] || '#6f42c1'; 
  }

  /**
   * Devuelve un color suave para el fondo del icono
   */
  getColorLight(id: number): string {
    const colors: any = {
      1: '#cfe2ff',
      2: '#d1e7dd',
      3: '#fff3cd',
    };
    return colors[id] || '#e2d9f3';
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