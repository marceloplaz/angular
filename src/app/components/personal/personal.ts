import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router'; // Importación esencial para [routerLink]
import { PersonaService } from '../../services/persona';

@Component({
  selector: 'app-personal',
  standalone: true,

  imports: [CommonModule, FormsModule, RouterModule,], 
  templateUrl: './personal.html',
  styleUrl: './personal.scss'

})
export class PersonalComponent implements OnInit {
  private _personaService = inject(PersonaService);

 
  totalRecords: number = 0;
  rows: number = 10;
  first: number = 0;
  paginaActual: number = 1;

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

  // --- NUEVO MÉTODO PARA CARGA MASIVA ---

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      // Validar extensión (opcional pero recomendado)
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xlsx' && extension !== 'xls') {
        alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
      }

      // Confirmación simple antes de procesar
      if (confirm(`¿Deseas importar el personal desde el archivo "${file.name}"?`)) {
        
        this._personaService.importarPersonalExcel(file).subscribe({
          next: (res) => {
            alert('¡Importación exitosa! El personal ha sido registrado correctamente.');
            this.cargarDatos(); // Refrescamos la tabla automáticamente
          },
          error: (err) => {
            console.error('Error en importación:', err);
            const errorMsg = err.error?.error || 'Hubo un problema al procesar el archivo.';
            alert('Error: ' + errorMsg);
          }
        });
      }
      
      // Limpiar el input para permitir subir el mismo archivo si fuera necesario
      event.target.value = '';
    }
  }




  cargarDatos( page: number = 1): void {
    this.paginaActual = page; // Actualizamos la página actual
    this.first = (page - 1) * this.rows; 

    this._personaService.getPersonas().subscribe({
    
      next: (res: any) => {
        // Ajuste según estructura de respuesta de Laravel
        this.listaPersonas = res.data ? res.data : (Array.isArray(res) ? res : []);
        this.totalRecords = res.total || this.listaPersonas.length;
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
 
onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    // PrimeNG usa índice 0, Laravel necesita página 1, 2, 3...
    const pagina = event.page + 1;
    this.cargarDatos(pagina); 
  }

  exportarPdf(): void {
 

  this._personaService.exportarPdf().subscribe({
    next: (data: Blob) => {
      // 1. Crear un objeto URL para el Blob recibido
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // 2. Crear un elemento 'a' invisible para disparar la descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Hospital_${new Date().getTime()}.pdf`;
      
      // 3. Simular el clic y limpiar
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
      
      // Swal.close();
    },
    error: (err) => {
      console.error('Error al descargar el PDF:', err);
      // Swal.fire('Error', 'No se pudo generar el reporte', 'error');
    }
  });
}


}