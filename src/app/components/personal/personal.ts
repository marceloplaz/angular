import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router'; 
import { PersonaService } from '../../services/persona';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS } from '../../constants/pdf-colors';
import { CategoriasService } from 'src/app/services/categorias';
import { error } from 'node:console';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule], 
  templateUrl: './personal.html',
  styleUrl: './personal.scss'
})
export class PersonalComponent implements OnInit {
  private _personaService = inject(PersonaService);
  private fb = inject(FormBuilder);

  tabActiva: string = 'Todos';
  totalRecords: number = 0;
  rows: number = 10;
  first: number = 0;
  paginaActual: number = 1;

  categorias: any[] = [];
  categoriaSeleccionada: any = 'TODOS';

  public listaPersonas: any[] = [];
  public personasFiltradas: any[] = [];
  
  public reporteTurnosForm!: FormGroup;
  public categoriaFiltroActiva: string = 'TODOS';

  public mostrarModal: boolean = false;
  public editando: boolean = false;
  public usuarioIdSeleccionado: number | null = null;
  public filtroActual: string = 'Todos';
  public terminoBusqueda: string = '';

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

  private NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];


  constructor(private categoriaService: CategoriasService) {}

  ngOnInit(): void { 
    this.cargarDatos(); 
   this.cargarCategorias();

    const mesActual = new Date().getMonth() + 1;
    const gestionActual = new Date().getFullYear();
    

    this.reporteTurnosForm = this.fb.group({
      mes_id: [mesActual, Validators.required],
      gestion: [gestionActual, Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      categoria_id: ['']
      
      });

    this.actualizarRangoPorMes();
  }

  // --- MÉTODO PARA CARGA MASIVA DE EXCEL ---
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'xlsx' && extension !== 'xls') {
        alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        return;
      }

      if (confirm(`¿Deseas importar el personal desde el archivo "${file.name}"?`)) {
        this._personaService.importarPersonalExcel(file).subscribe({
          next: () => {
            alert('¡Importación exitosa! El personal ha sido registrado correctamente.');
            this.cargarDatos(); 
          },
          error: (err) => {
            console.error('Error en importación:', err);
            const errorMsg = err.error?.error || 'Hubo un problema al procesar el archivo.';
            alert('Error: ' + errorMsg);
          }
        });
      }
      event.target.value = '';
    }
  }

  cargarCategorias() {
    this._personaService.getCatalogosFormulario().subscribe({next:(res: any) => {
    this.categorias = res.categorias || res;
    },
    error: (err) => {
    console.error('error al cargar categorias', err);
    }
    });   
  }


  cargarDatos(page: number = 1): void {
    this.paginaActual = page; 
    this.first = (page - 1) * this.rows; 

    this._personaService.getPersonas().subscribe({
      next: (res: any) => {
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
    this.categoriaFiltroActiva = tipo; 
    this.reporteTurnosForm.patchValue({ categoria_nombre: tipo });
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

  // --- MÉTODOS PARA PDF MATRICIAL DE TURNOS ---

  actualizarRangoPorMes(): void {
    const mes = Number(this.reporteTurnosForm.get('mes_id')?.value) || (new Date().getMonth() + 1);
    const gestion = Number(this.reporteTurnosForm.get('gestion')?.value) || new Date().getFullYear();

    const primerDia = new Date(gestion, mes - 1, 1);
    const fechaInicioStr = primerDia.toISOString().split('T')[0];

    const ultimoDia = new Date(gestion, mes, 0);
    const fechaFinStr = ultimoDia.toISOString().split('T')[0];

    this.reporteTurnosForm.patchValue({
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFinStr
    }, { emitEvent: false });
  }

  // --- GESTIÓN DE MODALES ---

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

  cerrarModal() { 
    this.mostrarModal = false; 
  }

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
    const pagina = event.page + 1;
    this.cargarDatos(pagina); 
  }

  exportarPdf(): void {
    this._personaService.exportarPdf().subscribe({
      next: (data: Blob) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reporte_Hospital_${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        link.remove();
      },
      error: (err) => {
        console.error('Error al descargar el PDF:', err);
      }
    });
  }

 generarPdfTurnosPersonal(): void {
  const datosReporte = this.reporteTurnosForm.value;
  console.log('Generando reporte con:', datosReporte);
  
  if (this.reporteTurnosForm.invalid) {
    alert('Por favor, completa los datos del mes y la gestión.');
    return;
  }

  const { mes_id, gestion } = datosReporte;
  const filtroSeleccionado = datosReporte.categoria_nombre || datosReporte.categoria_id || 'Todos';
  const nombreMes = this.NOMBRES_MESES[Number(mes_id) - 1] || 'General';
  const tipoSalarioActivo = this.tabActiva || 'Todos'; // 'tgn', 'sus', 'contrato' o 'todos'
  const categoriaSeleccionadaModal = datosReporte.categoria_nombre || datosReporte.categoria_id;

  

   this._personaService.getMatrizTurnos(mes_id, gestion, tipoSalarioActivo, categoriaSeleccionadaModal).subscribe({
    
    next: (res: any) => {
      const personalList = res.data || [];
      const fecha_inicio = res.fecha_inicio;
      const fecha_fin = res.fecha_fin;
      const nombreFiltroAplicado = res.nombre_categoria || filtroSeleccionado;

      if (personalList.length === 0) {
        alert('No hay personal o turnos registrados para este período y filtro.');
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal

      // Encabezado
      doc.setFillColor(...PDF_COLORS['VERDE_HOSPITAL']);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...PDF_COLORS['BLANCO']);
      doc.text('HOSPITAL REGIONAL SAN JUAN DE DIOS', 14, 14);

      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(`REPORTE DE ASISTENCIA Y TURNOS - MATRIZ MENSUAL`, 14, 28);
      doc.text(`FILTRO / CATEGORÍA: ${nombreFiltroAplicado.toUpperCase()}`, 14, 34);
      doc.text(`MES: ${nombreMes.toUpperCase()} / ${gestion}`, 283, 34, { align: 'right' });
      doc.text(`PERIODO: Del ${fecha_inicio} al ${fecha_fin}`, 14, 39);

      // Generar columnas de días (del 1 al 31 según el mes)
      const fechasCabecera: string[] = [];
      let currDate = new Date(fecha_inicio + 'T00:00:00');
      const endDate = new Date(fecha_fin + 'T00:00:00');
      
      while (currDate <= endDate) {
        fechasCabecera.push(currDate.toISOString().split('T')[0]);
        currDate.setDate(currDate.getDate() + 1);
      }

      const headColumns = [
        'NOMBRE COMPLETO', 
        ...fechasCabecera.map(f => f.split('-')[2]), 
        'DÍAS', 
        'HORAS'
      ];

      // Mapear filas con los turnos reales devueltos por Laravel
      const bodyRows = personalList.map((item: any) => {
        const nombre = (item.persona?.nombre_completo || item.name || 'SIN NOMBRE').toUpperCase();
        let fila: any[] = [nombre];
        let diasTrabajados = 0;
        let horasTotales = 0;

        fechasCabecera.forEach(fechaStr => {
          const turnoEnFecha = (item.turnos || []).find((t: any) => t.fecha === fechaStr);
          if (turnoEnFecha) {
            diasTrabajados++;
            horasTotales += Number(turnoEnFecha.duracion_horas || 8);
            fila.push(turnoEnFecha.abreviatura || turnoEnFecha.nombre_turno || 'X');
          } else {
            fila.push('-');
          }
        });

        fila.push(diasTrabajados);
        fila.push(`${horasTotales}h`);
        return fila;
      });

      autoTable(doc, {
        startY: 43,
        head: [headColumns],
        body: bodyRows,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS['VERDE_HOSPITAL'], halign: 'center', fontSize: 6, cellPadding: 1 },
        styles: { fontSize: 6, cellPadding: 1, halign: 'center', valign: 'middle' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 } },
        alternateRowStyles: { fillColor: [245, 247, 246] }
      });

      doc.save(`Matriz_Turnos_${nombreMes}_${gestion}_${filtroSeleccionado}.pdf`);
    },
    error: (err) => {
      console.error('Error al obtener la matriz de turnos:', err);
      alert('Ocurrió un error al generar el reporte en el servidor.');
    }
  });
}
}