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
  searchTerm: string = '';

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
  const idBusqueda = Number(categoriaId);
  const busqueda = this.searchTerm.toLowerCase().trim();

  return this.usuarios.filter(u => {
    // Primero validamos que pertenezca a la categoría (como Dante con ID 4)
    const perteneceACat = Number(u.categoria_id) === idBusqueda;
    
    // Si no hay búsqueda, mostramos todos los de la categoría
    if (!busqueda) return perteneceACat;

    // Si hay búsqueda, verificamos nombre de usuario o nombre completo
    const coincideNombre = 
      u.name.toLowerCase().includes(busqueda) || 
      (u.persona?.nombre_completo?.toLowerCase().includes(busqueda));

    return perteneceACat && coincideNombre;
  });
}
descargarReporte(categoriaId?: number) {
  // Construimos la URL uniendo la base de la API con la ruta de Laravel
  let url = `${environment.apiUrl}/personal/exportar-pdf`;
  
  // Si recibimos un ID, lo añadimos como parámetro de consulta (?)
  if (categoriaId) {
    url += `?categoria_id=${categoriaId}`;
  }
  
  // Abrimos la URL en una nueva pestaña para que Laravel genere el PDF
  window.open(url, '_blank');

}
getColor(id: number): string {
    const colors: any = {
      1: '#0d6efd', // Azul
      2: '#198754', // Verde
      3: '#f1a100', // Amarillo
    };
    return colors[id] || '#6f42c1'; 
  }

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