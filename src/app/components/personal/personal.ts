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
  public tiposSalario: any[] = [];
  public reporteTurnosForm!: FormGroup;
  public categoriaFiltroActiva: string = 'TODOS';
  public mostrarBotonComidas: boolean = false;
  public mostrarModal: boolean = false;
  public editando: boolean = false;
  public usuarioIdSeleccionado: number | null = null;
  public filtroActual: string = 'Todos';
  public terminoBusqueda: string = '';
  
 private CATEGORIAS_CON_COMIDA: string[] = [
  'MEDICOS',
  'MEDICO',
  'INTERNOS-MEDICINA',
  'INTERNOS-IMAGENOLOGIA',
  'INTERNOS',
  'RESIDENTES'
];
  
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
      categoria_id: [''],
      dia_relativo: [0, Validators.required]
            });

      this.actualizarRangoPorMes();
      
      this.reporteTurnosForm.get('categoria_id')?.valueChanges.subscribe(val => {
      this.evaluarVisibilidadComidas(val);
    });
    this.reporteTurnosForm.get('categoria_nombre')?.valueChanges.subscribe(val => {
      this.evaluarVisibilidadComidas(val);
    });

  }

   //visibilidad de comidas segun boton y seleccion de categoria
  evaluarVisibilidadComidas(valorCategoria: any): void {
  if (!valorCategoria || valorCategoria === '' || valorCategoria === 'TODOS') {
    this.mostrarBotonComidas = false;
    return;
  }

  let nombreBusqueda = '';

  // Si recibimos un ID (ej: "1" o 1)
  if (!isNaN(Number(valorCategoria))) {
    const encontrada = this.categorias.find(c => c.id == valorCategoria);
    if (encontrada) {
      nombreBusqueda = encontrada.nombre || encontrada.categoria || '';
    }
  } else {
    // Si se recibe directamente el texto del select
    nombreBusqueda = valorCategoria.toString();
  }

  // Si aún no han cargado las categorías, intentamos sincronizar
  if (!nombreBusqueda && this.categorias.length === 0) {
    this.mostrarBotonComidas = false;
    return;
  }

  // Sanitizado: Convertir a mayúsculas y quitar acentos (é -> e)
  const textoLimpio = nombreBusqueda
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  // Evaluamos si el texto coincide con la lista permitida
  this.mostrarBotonComidas = this.CATEGORIAS_CON_COMIDA.some(cat => 
    textoLimpio.includes(cat) || cat.includes(textoLimpio)
  );

  console.log('Categoría seleccionada:', valorCategoria, '| Nombre resolved:', textoLimpio, '| Visible:', this.mostrarBotonComidas);
}
  
   //FALTA REVISAR  ES EL LOGO EN ACCIONES
descargarReporteAlimentacion(personaId: number): void {
    this._personaService.getReporteAlimentacionPersona(personaId).subscribe({
      next: (res: any) => {
        console.log('Datos del reporte:', res);
        this.generarPDFAlimentacion(res);
      },
      error: (err: any) => { // Tipado explícito para evitar TS7006
        console.error('Error al generar reporte de alimentación:', err);
      }
    });
  }

  // Agrega este método para procesar la respuesta   ES EN LAS ACCIONES
  generarPDFAlimentacion(data: any): void {
    // Aquí invocas tu librería de generación de PDF (ej. pdfMake, jsPDF)
    console.log('Generando PDF para:', data);
  }

cargarCategorias() {
  this._personaService.getCatalogosFormulario().subscribe({
    next: (res: any) => {
      this.categorias = res.categorias || res;
      this.tiposSalario = res.tipos_salario || [];

      // Re-evaluar visibilidad tras cargar la lista por si el select ya tenía un valor por defecto
      const valActual = this.reporteTurnosForm.get('categoria_id')?.value;
      if (valActual) {
        this.evaluarVisibilidadComidas(valActual);
      }
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

  // --- MÉTODOS PARA PDF MATRIZ DE TURNOS ---

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
  
generarPdfComidasPersonal(): void {
  if (this.reporteTurnosForm.invalid) {
    alert('Completa los datos del Mes y la Gestión.');
    return;
  }

  const datosReporte = this.reporteTurnosForm.value;
  const { mes_id, gestion, fecha_inicio, fecha_fin } = datosReporte;
  const filtroSeleccionado = datosReporte.categoria_nombre || datosReporte.categoria_id || 'Todos';
  const nombreMes = this.NOMBRES_MESES[Number(mes_id) - 1] || 'General';
  const tipoSalarioActivo = this.tabActiva || 'Todos';
  const categoriaSeleccionadaModal = datosReporte.categoria_nombre || datosReporte.categoria_id;

  this._personaService.getMatrizTurnos(mes_id, gestion, tipoSalarioActivo, categoriaSeleccionadaModal, fecha_inicio, fecha_fin).subscribe({
    next: (res: any) => {
      const personalList = res.data || [];
      const nombreFiltroAplicado = res.nombre_categoria || filtroSeleccionado;

      // 🔍 FILTRO: Evalúa la propiedad 'comidas_mes' del backend
      const personalConComidas = personalList.filter((user: any) => {
        if (!user.comidas_mes) return false;

        if (Array.isArray(user.comidas_mes)) {
          return user.comidas_mes.length > 0;
        }

        if (typeof user.comidas_mes === 'object') {
          return Object.keys(user.comidas_mes).length > 0;
        }

        return false;
      });

      if (personalConComidas.length === 0) {
        alert('No se encontraron registros de personal con asignación de comidas en esta categoría para el rango seleccionado.');
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal (Ancho total: 297mm)

      // 🎨 ENCABEZADO INSTITUCIONAL DE COMIDAS (Naranja)
      const COLOR_NARANJA: [number, number, number] = [230, 126, 34];
      doc.setFillColor(...COLOR_NARANJA);
      doc.rect(0, 0, 297, 22, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('HOSPITAL REGIONAL SAN JUAN DE DIOS', 14, 14);

      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(`REPORTE DE ASIGNACIÓN DE COMIDAS - MATRIZ MENSUAL`, 14, 28);
      doc.text(`FILTRO / CATEGORÍA: ${nombreFiltroAplicado.toUpperCase()}`, 14, 34);
      doc.text(`MES: ${nombreMes.toUpperCase()} / ${gestion}`, 283, 34, { align: 'right' });
      doc.text(`PERIODO: Del ${fecha_inicio} al ${fecha_fin}`, 14, 39);

      // 🟢 RANGO Y GENERACIÓN DE FECHAS DE CABECERA
      const [fIniYear, fIniMonth, fIniDay] = fecha_inicio.split('-').map(Number);
      const [fFinYear, fFinMonth, fFinDay] = fecha_fin.split('-').map(Number);

      let currDate = new Date(fIniYear, fIniMonth - 1, fIniDay);
      const endDate = new Date(fFinYear, fFinMonth - 1, fFinDay);

      const fechasCabecera: string[] = [];
      while (currDate <= endDate) {
        const yyyy = currDate.getFullYear();
        const mm = String(currDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currDate.getDate()).padStart(2, '0');
        
        fechasCabecera.push(`${yyyy}-${mm}-${dd}`);
        currDate.setDate(currDate.getDate() + 1);
      }

      const headColumns = [
        'NOMBRE COMPLETO', 
        ...fechasCabecera.map(f => f.split('-')[2]), 
        'TOTAL'
      ];

      // 🔍 CONSTRUCCIÓN DE FILAS Y MAPEO DESDE 'comidas_mes'
      const bodyRows = personalConComidas.map((item: any) => {
        const nombre = (item.persona?.nombre_completo || item.name || 'SIN NOMBRE').toUpperCase();
        
        const mapaComidasFecha: { [fecha: string]: { texto: string, cantidad: number } } = {};

        if (Array.isArray(item.comidas_mes)) {
          item.comidas_mes.forEach((c: any) => {
            const texto = c.texto_resumen || '';
            const cantidad = c.detalles ? c.detalles.length : texto.length;
            mapaComidasFecha[c.fecha] = { texto, cantidad };
          });
        } else if (typeof item.comidas_mes === 'object') {
          Object.keys(item.comidas_mes).forEach((fechaKey: string) => {
            const obj = item.comidas_mes[fechaKey];
            const texto = obj.texto_resumen || '';
            const cantidad = obj.detalles ? obj.detalles.length : texto.length;
            mapaComidasFecha[fechaKey] = { texto, cantidad };
          });
        }

        let totalComidasUsuario = 0;
        const fila: any[] = [nombre];

        fechasCabecera.forEach(fechaStr => {
          const infoComida = mapaComidasFecha[fechaStr];

          if (infoComida && infoComida.texto) {
            totalComidasUsuario += infoComida.cantidad;
            fila.push(infoComida.texto); // Ej: "ATC", "D", "A"
          } else {
            fila.push('-');
          }
        });

        fila.push(totalComidasUsuario);
        return fila;
      });

      // 📐 CÁLCULO DINÁMICO DE ANCHOS DE COLUMNA
      const marginLeftRight = 28; // Margen izq (14mm) + dcho (14mm)
      const anchoPagina = 297;
      const anchoNombre = 48;
      const anchoTotal = 12;
      const totalDias = fechasCabecera.length;
      
      const espacioParaDias = anchoPagina - marginLeftRight - anchoNombre - anchoTotal;
      const anchoPorDia = Number((espacioParaDias / totalDias).toFixed(2));

      const columnStylesConfig: any = {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: anchoNombre } 
      };

      let currentIdx = 1;
      fechasCabecera.forEach(() => {
        columnStylesConfig[currentIdx] = { halign: 'center', cellWidth: anchoPorDia }; 
        currentIdx++;
      });
      columnStylesConfig[currentIdx] = { halign: 'center', cellWidth: anchoTotal, fontStyle: 'bold' }; 

      // 🖨️ RENDERIZADO CON AUTOTABLE
      autoTable(doc, {
        startY: 43,
        head: [headColumns],
        body: bodyRows,
        theme: 'grid',
        headStyles: { 
          fillColor: COLOR_NARANJA, 
          halign: 'center', 
          fontSize: 5.5, 
          cellPadding: 0.8 
        },
        styles: { 
          fontSize: 4.5, 
          cellPadding: 0.6, 
          halign: 'center', 
          valign: 'middle',
          font: 'helvetica'
        },
        columnStyles: columnStylesConfig,
        alternateRowStyles: { fillColor: [253, 245, 238] }
      });

      doc.save(`Reporte_Comidas_${nombreMes}_${gestion}_${nombreFiltroAplicado}.pdf`);
    },
    error: (err) => {
      console.error('Error al obtener la matriz de turnos para comidas:', err);
      alert('Ocurrió un error al obtener la información del servidor.');
    }
  });
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
  if (this.reporteTurnosForm.invalid) {
    alert('Completa los datos del Mes y la Gestión.');
    return;
  }
  
  const datosReporte = this.reporteTurnosForm.value;
  const { mes_id, gestion, fecha_inicio, fecha_fin } = datosReporte;
  const filtroSeleccionado = datosReporte.categoria_nombre || datosReporte.categoria_id || 'Todos';
  const nombreMes = this.NOMBRES_MESES[Number(mes_id) - 1] || 'General';
  const tipoSalarioActivo = this.tabActiva || 'Todos'; 
  const categoriaSeleccionadaModal = datosReporte.categoria_nombre || datosReporte.categoria_id;

  this._personaService.getMatrizTurnos(mes_id, gestion, tipoSalarioActivo, categoriaSeleccionadaModal, fecha_inicio, fecha_fin).subscribe({
    next: (res: any) => {
      const personalList = res.data || [];
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

      // 🟢 RANGO Y GENERACIÓN DE FECHAS DE CABECERA
      const [fIniYear, fIniMonth, fIniDay] = fecha_inicio.split('-').map(Number);
      const [fFinYear, fFinMonth, fFinDay] = fecha_fin.split('-').map(Number);

      let currDate = new Date(fIniYear, fIniMonth - 1, fIniDay);
      const endDate = new Date(fFinYear, fFinMonth - 1, fFinDay);

      const fechasCabecera: string[] = [];
      while (currDate <= endDate) {
        const yyyy = currDate.getFullYear();
        const mm = String(currDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currDate.getDate()).padStart(2, '0');
        
        fechasCabecera.push(`${yyyy}-${mm}-${dd}`);
        currDate.setDate(currDate.getDate() + 1);
      }

      const headColumns = [
        'NOMBRE COMPLETO', 
        ...fechasCabecera.map(f => f.split('-')[2]), 
        'DÍAS', 
        'HORAS'
      ];

      const abreviarServicio = (nombre: string): string => {
        if (!nombre) return '';
        const map: { [key: string]: string } = {
          'HEMODIALISIS': 'HEM',
          'CIRUGIA MUJERES': 'CIR.M',
          'CIRUGIA VARONES': 'CIR.V',
          'MEDICINA MUJERES': 'MED.M',
          'MEDICINA VARONES': 'MED.V',
          'GINECOLOGIA': 'GIN',
          'MATERNIDAD': 'MAT',
          'QUIROFANO': 'QFNO',
          'PEDIATRIA': 'PED',
          'NEONATOLOGIA': 'NEO',
          'EMERGENCIAS': 'EME',
        };
        const upper = nombre.toUpperCase();
        return map[upper] || upper.substring(0, 3);
      };

      const bodyRows = personalList.map((item: any) => {
        const nombre = (item.persona?.nombre_completo || item.name || 'SIN NOMBRE').toUpperCase();
        
        // 🌟 CLAVE: DICCIONARIO POR FECHA ÚNICA PARA CONSOLIDAR Y EVITAR TRIPLICACIÓN
        const turnosPorFecha: { [fecha: string]: any } = {};
        const turnosArray = item.turnos || [];

        turnosArray.forEach((t: any) => {
          const fechaKey = t.pivot ? t.pivot.fecha : t.fecha;
          if (fechaKey && !turnosPorFecha[fechaKey]) {
            turnosPorFecha[fechaKey] = t;
          }
        });

        let fila: any[] = [nombre];
        let diasTrabajados = 0;
        let horasTotales = 0;

        fechasCabecera.forEach(fechaStr => {
          const turnoEnFecha = turnosPorFecha[fechaStr];

          if (turnoEnFecha) {
            diasTrabajados++;
            const duracion = Number(turnoEnFecha.duracion_horas || turnoEnFecha.horas || 0);
            horasTotales += duracion;

            let nombreTurno = turnoEnFecha.nombre_turno || 'TURNO';
            if (nombreTurno.toLowerCase().includes('tarde/noche')) nombreTurno = 'T/N';
            if (nombreTurno.toLowerCase().includes('mañana/tarde')) nombreTurno = 'M/T';
            if (nombreTurno.toLowerCase().includes('noche')) nombreTurno = 'N';

            const horaInicio = turnoEnFecha.hora_inicio ? turnoEnFecha.hora_inicio.substring(0, 5) : '';
            const horaFin = turnoEnFecha.hora_fin ? turnoEnFecha.hora_fin.substring(0, 5) : '';
            const rawServicio = turnoEnFecha.pivot ? turnoEnFecha.pivot.nombre_servicio : '';
            const servicioCorto = abreviarServicio(rawServicio);

            let textoCelda = `${nombreTurno}`;
            if (horaInicio && horaFin) {
              textoCelda += `\n${horaInicio}-${horaFin}`;
            }
            if (servicioCorto) {
              textoCelda += `\n${servicioCorto}`;
            }

            fila.push(textoCelda);
          } else {
            fila.push('-');
          }
        });

        fila.push(diasTrabajados);
        fila.push(`${horasTotales}h`);
        return fila;
      });

      const columnStylesConfig: any = {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 }
      };

      let currentIdx = 1;
      fechasCabecera.forEach(() => {
        columnStylesConfig[currentIdx] = { halign: 'center', cellWidth: 6.5 };
        currentIdx++;
      });
      columnStylesConfig[currentIdx] = { halign: 'center', cellWidth: 10, fontStyle: 'bold' }; 
      columnStylesConfig[currentIdx + 1] = { halign: 'center', cellWidth: 12, fontStyle: 'bold' };

      autoTable(doc, {
        startY: 43,
        head: [headColumns],
        body: bodyRows,
        theme: 'grid',
        headStyles: { 
          fillColor: PDF_COLORS['VERDE_HOSPITAL'], 
          halign: 'center', 
          fontSize: 5.5, 
          cellPadding: 1 
        },
        styles: { 
          fontSize: 4, 
          cellPadding: 0.8, 
          halign: 'center', 
          valign: 'middle',
          font: 'helvetica'
        },
        columnStyles: columnStylesConfig,
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