import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './personal.html'
})
export class PersonalComponent implements OnInit {
  private http = inject(HttpClient);

  // Variables para datos y filtrado
  public listaPersonas: any[] = [];         // Datos brutos del servidor
  public personasFiltradas: any[] = [];    // Datos que se muestran en el HTML
  public filtroActual: string = 'Todos';   // Control de botones TGN/SUS/Contrato
  public terminoBusqueda: string = '';     // Control del input buscador

  public mostrarModal = false;
  public editando = false;                 // Control para saber si el modal es crear o editar
  public usuarioIdSeleccionado: number | null = null;

  public nuevoUsuario: any = {
    name: '', email: '', password: '', categoria_id: '',
    nombre_completo: '', carnet_identidad: '', genero: 'Masculino',
    telefono: '', direccion: '', tipo_trabajador: '',
    nacionalidad: 'Boliviana', tipo_salario: '', numero_tipo_salario: ''
  };

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.get(`${environment.apiUrl}/usuarios`, { headers }).subscribe({
      next: (res: any) => {
        this.listaPersonas = Array.isArray(res) ? res : (res.data || []);
        this.personasFiltradas = [...this.listaPersonas]; // Inicializamos la visualización
      },
      error: (err) => console.error('Error al cargar datos:', err)
    });
  }

  // --- Lógica de Búsqueda y Filtros ---

  aplicarFiltro(tipo: string): void {
    this.filtroActual = tipo;
    this.filtrarTodo();
  }

  filtrarTodo(): void {
    this.personasFiltradas = this.listaPersonas.filter(item => {
      // 1. Filtro por categoría de salario
      const cumpleFiltro = this.filtroActual === 'Todos' || 
                           item.persona?.tipo_salario === this.filtroActual;

      // 2. Filtro por buscador (Nombre o CI)
      const busqueda = this.terminoBusqueda.toLowerCase();
      const cumpleBusqueda = !busqueda || 
                             item.persona?.nombre_completo.toLowerCase().includes(busqueda) ||
                             item.persona?.carnet_identidad.includes(busqueda);

      return cumpleFiltro && cumpleBusqueda;
    });
  }

  // --- Lógica CRUD ---

  guardarUsuario() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    const payload = {
      name: this.nuevoUsuario.name,
      email: this.nuevoUsuario.email,
      password: this.nuevoUsuario.password,
      password_confirmation: this.nuevoUsuario.password,
      categoria_id: this.nuevoUsuario.categoria_id,
      roles: [10],
      persona: {
        nombre_completo: this.nuevoUsuario.nombre_completo,
        carnet_identidad: this.nuevoUsuario.carnet_identidad,
        genero: this.nuevoUsuario.genero,
        telefono: this.nuevoUsuario.telefono,
        direccion: this.nuevoUsuario.direccion,
        tipo_trabajador: this.nuevoUsuario.tipo_trabajador,
        nacionalidad: this.nuevoUsuario.nacionalidad,
        tipo_salario: this.nuevoUsuario.tipo_salario,
        numero_tipo_salario: this.nuevoUsuario.numero_tipo_salario
      }
    };

    // Si estamos editando, usamos PUT; si no, POST
    const request = this.editando 
      ? this.http.put(`${environment.apiUrl}/usuarios/${this.usuarioIdSeleccionado}`, payload, { headers })
      : this.http.post(`${environment.apiUrl}/usuarios`, payload, { headers });

    request.subscribe({
      next: (res) => {
        alert(this.editando ? '¡Actualizado con éxito!' : '¡Guardado con éxito!');
        this.cargarDatos();
        this.cerrarModal();
      },
      error: (err) => console.error('Error en operación:', err)
    });
  }

  prepararEdicion(usuario: any): void {
    this.editando = true;
    this.usuarioIdSeleccionado = usuario.id;
    this.mostrarModal = true;
    
    // Rellenamos el formulario con los datos existentes
    this.nuevoUsuario = {
      name: usuario.name,
      email: usuario.email,
      categoria_id: usuario.categoria_id,
      nombre_completo: usuario.persona?.nombre_completo,
      carnet_identidad: usuario.persona?.carnet_identidad,
      genero: usuario.persona?.genero,
      telefono: usuario.persona?.telefono,
      direccion: usuario.persona?.direccion,
      tipo_trabajador: usuario.persona?.tipo_trabajador,
      nacionalidad: usuario.persona?.nacionalidad,
      tipo_salario: usuario.persona?.tipo_salario,
      numero_tipo_salario: usuario.persona?.numero_tipo_salario
    };
  }

  eliminarPersona(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      const token = localStorage.getItem('token');
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

      this.http.delete(`${environment.apiUrl}/usuarios/${id}`, { headers }).subscribe({
        next: () => {
          this.cargarDatos();
          alert('Registro eliminado correctamente');
        },
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }

  verDetalles(persona: any) {
    console.log('Mostrando detalles de:', persona);
    // Aquí puedes abrir un modal o navegar
  }
  cerrarModal() {
    this.mostrarModal = false;
    this.editando = false;
    this.usuarioIdSeleccionado = null;
    this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.nuevoUsuario = {
      name: '', email: '', password: '', categoria_id: '',
      nombre_completo: '', carnet_identidad: '', genero: 'Masculino',
      telefono: '', direccion: '', tipo_trabajador: '',
      nacionalidad: 'Boliviana', tipo_salario: '', numero_tipo_salario: ''
    };
  }
}