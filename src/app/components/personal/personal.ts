import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // Importación esencial para [routerLink]

import { PersonaService } from '../../services/persona';

@Component({
  selector: 'app-personal',
  standalone: true,
  // Agregamos RouterModule para habilitar la navegación en el HTML
  imports: [CommonModule, FormsModule, RouterModule], 
  templateUrl: './personal.html',
   // Corregido: antes decía templateUrl de nuevo
})
export class PersonalComponent implements OnInit {
  private _personaService = inject(PersonaService);

  public listaPersonas: any[] = [];
  public personasFiltradas: any[] = [];
  public mostrarModal: boolean = false;
//  public mostrarDetallesModal: boolean = false;
  public editando: boolean = false;
  public usuarioIdSeleccionado: number | null = null;
  public filtroActual: string = 'Todos';
  public terminoBusqueda: string = '';
  //public pSeleccionado: any = null;
  //public personaDetalle: any = null;

  // Estructura para nuevo usuario / edición
  public nuevoUsuario: any = {
    name: '', 
    email: '', 
    password: '', 
    categoria_id: '1',
    nombre_completo: '', 
    carnet_identidad: '', 
    genero: 'Masculino',
    telefono: '', 
    direccion: '', 
    tipo_trabajador: 'Enfermera',
    nacionalidad: 'Boliviana', 
    tipo_salario: 'TGN', 
    numero_tipo_salario: ''
  };

  ngOnInit(): void { 
    this.cargarDatos(); 
  }

  // --- LÓGICA DE DATOS ---

  cargarDatos(): void {
    this._personaService.getPersonas().subscribe({
      next: (res: any) => {
        // Ajuste según estructura de respuesta de Laravel
        this.listaPersonas = res.data ? res.data : (Array.isArray(res) ? res : []);
        this.personasFiltradas = [...this.listaPersonas];
        this.filtrarTodo();
      },
      error: (err) => console.error('Error al cargar lista:', err)
    });
  }

  aplicarFiltro(tipo: string): void {
    this.filtroActual = tipo;
    this.filtrarTodo();
  }

  filtrarTodo(): void {
    this.personasFiltradas = this.listaPersonas.filter(item => {
      const cumpleFiltro = this.filtroActual === 'Todos' || item.persona?.tipo_salario === this.filtroActual;
      const busqueda = this.terminoBusqueda.toLowerCase();
      
      const coincideNombre = item.persona?.nombre_completo?.toLowerCase().includes(busqueda);
      const coincideCI = item.persona?.carnet_identidad?.includes(busqueda);

      return cumpleFiltro && (!busqueda || coincideNombre || coincideCI);
    });
  }

  // --- GESTIÓN DE MODALES ---

//  verDetalles(p: any): void {
 //   this.pSeleccionado = p;
   // this.personaDetalle = p.persona || {};
    //this.mostrarDetallesModal = true;
 // }

  //cerrarDetalles(): void {
    //this.mostrarDetallesModal = false;
    //this.pSeleccionado = null;
    //this.personaDetalle = null;
  //}

  abrirModalNuevo() {
    this.editando = false;
    this.limpiarFormulario();
    this.mostrarModal = true;
  }

  prepararEdicion(usuario: any): void {
    this.editando = true;
    this.usuarioIdSeleccionado = usuario.id;
    this.nuevoUsuario = {
      name: usuario.name,
      email: usuario.email,
      password: '', // Password se deja vacío en edición por seguridad
      categoria_id: usuario.categoria_id?.toString() || '1',
      nombre_completo: usuario.persona?.nombre_completo || '',
      carnet_identidad: usuario.persona?.carnet_identidad || '',
      genero: usuario.persona?.genero || 'Masculino',
      telefono: usuario.persona?.telefono || '',
      direccion: usuario.persona?.direccion || '',
      tipo_trabajador: usuario.persona?.tipo_trabajador || 'Enfermera',
      nacionalidad: usuario.persona?.nacionalidad || 'Boliviana',
      tipo_salario: usuario.persona?.tipo_salario || 'TGN',
      numero_tipo_salario: usuario.persona?.numero_tipo_salario || ''
    };
    this.mostrarModal = true;
  }

  cerrarModal() { 
    this.mostrarModal = false; 
  }

  // --- ACCIONES DE API ---

  eliminarPersona(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      this._personaService.deletePersona(id).subscribe({
        next: () => {
          alert('Registro eliminado correctamente');
          this.cargarDatos();
        },
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }

  private manejarErrores(err: any) {
    console.error('Errores detallados:', err.error?.errors);
    const msg = err.error?.message || 'Error en los datos';
    alert('No se pudo procesar la solicitud: ' + msg);
  }

  private finalizarOperacion() {
    this.cerrarModal();
    this.cargarDatos();
  }

  private limpiarFormulario() {
    this.nuevoUsuario = {
      name: '', email: '', password: '', categoria_id: '1',
      nombre_completo: '', carnet_identidad: '', genero: 'Masculino',
      telefono: '', direccion: '', tipo_trabajador: 'Enfermera',
      nacionalidad: 'Boliviana', tipo_salario: 'TGN', numero_tipo_salario: ''
    };
  }
}