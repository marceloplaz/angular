import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PersonaService } from '../../services/persona';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule], // Quitamos RouterLink porque no se usa
  templateUrl: './personal.html'
})
export class PersonalComponent implements OnInit {
  private _personaService = inject(PersonaService);

  public listaPersonas: any[] = [];
  public personasFiltradas: any[] = [];
  public mostrarModal: boolean = false;
  public mostrarDetallesModal: boolean = false;
  public editando: boolean = false;
  public usuarioIdSeleccionado: number | null = null;
  public filtroActual: string = 'Todos';
  public terminoBusqueda: string = '';
  public pSeleccionado: any = null;
  public personaDetalle: any = null;

  public nuevoUsuario: any = {
    name: '', email: '', password: '', 
    categoria_id: '1',
    nombre_completo: '', carnet_identidad: '', genero: 'Masculino',
    telefono: '', direccion: '', tipo_trabajador: 'Enfermera',
    nacionalidad: 'Boliviana', tipo_salario: 'TGN', numero_tipo_salario: ''
  };

  ngOnInit(): void { this.cargarDatos(); }

  verDetalles(p: any): void {
    this.pSeleccionado = p;
    this.personaDetalle = p.persona || {};
    this.mostrarDetallesModal = true;
  }

  cerrarDetalles(): void {
    this.mostrarDetallesModal = false;
    this.pSeleccionado = null;
    this.personaDetalle = null;
  }

  cargarDatos(): void {
    this._personaService.getPersonas().subscribe({
      next: (res: any) => {
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
      return cumpleFiltro && (!busqueda || 
             item.persona?.nombre_completo?.toLowerCase().includes(busqueda) ||
             item.persona?.carnet_identidad?.includes(busqueda));
    });
  }

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
      password: '',
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

  // --- FUNCIÓN CORREGIDA PARA ELIMINAR EL ERROR TS2339 ---
  eliminarPersona(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      this._personaService.deletePersona(id).subscribe({
        next: () => {
          alert('Registro eliminado');
          this.cargarDatos();
        },
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }

 guardarUsuario() {
  // 1. Construcción de los datos básicos
  const dataParaEnviar: any = {
    name: this.nuevoUsuario.name,
    email: this.nuevoUsuario.email,
    categoria_id: Number(this.nuevoUsuario.categoria_id),
    roles: [11], // Ajusta según el rol que necesites asignar
    persona: { // Campos obligatorios para la tabla 'personas'
      nombre_completo: this.nuevoUsuario.nombre_completo,
      carnet_identidad: this.nuevoUsuario.carnet_identidad,
      genero: this.nuevoUsuario.genero === 'Masculino' ? 'M' : 'F',
      telefono: this.nuevoUsuario.telefono,
      direccion: this.nuevoUsuario.direccion,
      tipo_trabajador: this.nuevoUsuario.tipo_trabajador ? this.nuevoUsuario.tipo_trabajador.toLowerCase() : 'enfermera',
      tipo_salario: this.nuevoUsuario.tipo_salario,
      numero_tipo_salario: this.nuevoUsuario.numero_tipo_salario.toString(),
      nacionalidad: 'Boliviana'
    }
  };

  // 2. LÓGICA DE CONTRASEÑA: Solo se añade si el usuario escribió algo
  if (this.nuevoUsuario.password && this.nuevoUsuario.password.trim() !== '') {
    if (this.nuevoUsuario.password.length < 8) {
      alert('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    dataParaEnviar.password = this.nuevoUsuario.password;
    dataParaEnviar.password_confirmation = this.nuevoUsuario.password;
  }

  // 3. Envío al servidor
  if (this.editando && this.usuarioIdSeleccionado) {
    this._personaService.updatePersona(this.usuarioIdSeleccionado, dataParaEnviar).subscribe({
      next: () => {
        alert('¡Registro y contraseña actualizados correctamente!');
        this.finalizarOperacion(); 
      },
      error: (err) => {
        console.error('Error al actualizar:', err.error);
        alert('Error: ' + (err.error.message || 'No se pudo actualizar'));
      }
    });
  } else {
    // Aquí iría tu lógica de crearPersona(dataParaEnviar) si no estás editando
  }
}

// Nueva función para ver qué campo exacto falta en la consola
private manejarErrores(err: any) {
  console.error('Errores detallados:', err.error.errors);
  const msg = err.error.message || 'Error en los datos';
  alert('No se pudo guardar: ' + msg);
}

  cerrarModal() { this.mostrarModal = false; }

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