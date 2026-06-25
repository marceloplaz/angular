import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DatePickerModule } from 'primeng/datepicker';

import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { NovedadComponent } from '../novedad/novedad';
import { DragDropModule, CdkDragDrop,  } from '@angular/cdk/drag-drop';

import { jsPDF } from 'jspdf';// imagen de pdf
import autoTable from 'jspdf-autotable';
import { formatDate } from '@angular/common';
import { DialogModule } from 'primeng/dialog'; 
import { ToastrService } from 'ngx-toastr'; 
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { ReporteMensualService } from 'src/app/services/reporte-mensual';


export interface ResumenMensual {
  usuario_nombre: string;
  total_dias: number;
  total_horas: number;
  categoria: string;
}
@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    CommonModule, 
    DatePickerModule,
    FormsModule, 
    DragDropModule, 
     NovedadComponent,    
    DialogModule,
    
  ],
  templateUrl: './turnos.html',
  styleUrl: './turnos.scss',
})

export class TurnosComponent implements OnInit {
  private toastr = inject(ToastrService);
  private turnoService = inject(TurnoService);
  private cdRef = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private _reporteMensualService = inject(ReporteMensualService); 
  alias: string = 'Usuario Administrativo';// para pdf login
  rolUsuario: string = ''; // para pdf login


  mostrarModalNovedad = false; 
  idTurnoParaNovedad: number | null = null;
  // Propiedades de datos
  servicios: any[] = [];
  categorias: any[] = [];
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  personalAgrupado: any[] = []; 
  listaTurnos: any[] = [];
  fechasRealesDeLaSemana: string[] = [];  
  // Propiedades de Historial y Modales
  historialCambios: any[] = []; 
  mostrarConfirmacion: boolean = false;
  datosTemporal: any = {};
  mostrarModalCRUD: boolean = false;
  turnoSeleccionado: any = null;
  verNovedades: boolean = false;        // Para el Historial de novedades
  loading: boolean = false;  
  mostrarVistaMensual: boolean = false;
  fechasSeleccionadas: Date[] = [];
  mostrarNovedades: boolean = false;
  
  isPeriodoBloqueado: boolean = false;  
  

  // --- Nuevas propiedades para la lógica de turnos ---
esMensual: boolean = false;
areaIdSeleccionado: any = null;
listaAreas: any[] = []; 
mostrarModalCalendario: boolean = false; // Controla la visibilidad del modal de calendario
diasSeleccionados: string[] = [];        // Aquí guardarás las fechas seleccionadas
todasLasGestiones: any[] = [];


  filters = { 
    servicio_id: null as any, 
    categoria_id: '' as any,
    gestion: 2026, 
    mes_id: null as any, 
    semana_id: null as any,
    servicio_nombre: '' as string, // <--- Agregar esta
    categoria_nombre: '' as string, // <--- Agregar esta
    mes_nombre: '' as string, // <--- Agregar esta
    };

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  cargando: boolean = false;
  mostrarModal = false;
  personalSeleccionado: any = null;
  diaSeleccionado: string = '';
  turnoIdSeleccionado: any = null;
  fechaUnica: string = '';
    

    // Aquí es donde debe vivir la función:
get rangoFechasMes(): { inicio: string, fin: string } {
  // Verificamos que existan semanas para evitar que la app explote
  if (!this.semanasDisponibles || this.semanasDisponibles.length === 0) {
    return { inicio: '', fin: '' };
  }

  return {
    inicio: this.semanasDisponibles[0].fecha_inicio,
    fin: this.semanasDisponibles[this.semanasDisponibles.length - 1].fecha_fin
  };
}  


// En turnos.ts
get personalParaReemplazo() {
  if (!this.personalAgrupado || !Array.isArray(this.personalAgrupado)) {
    return [];
  }
  return this.personalAgrupado.map(p => ({
    // ID del usuario para la base de datos
    id: p.usuario_id || p.id, 
    // Mapeamos el nombre asegurando que siempre haya un valor
    nombre_completo: p.usuario_nombre || p.nombre || (p.persona ? p.persona.nombre_completo : 'Sin nombre')
  }));
}

// cambiamos la inicializacion para el BLOQUEO

ngOnInit() {
  const nombreGuardado = localStorage.getItem('usuario_nombre');
  const rolGuardado = localStorage.getItem('usuario_rol');

  if (nombreGuardado) { this.alias = nombreGuardado; }
  if (rolGuardado) { this.rolUsuario = rolGuardado; }
 
  if (rolGuardado) { 
    // Normalizamos: minúsculas, elimina espacios extra, cambia espacios internos por '_'
    this.rolUsuario = rolGuardado.toLowerCase().trim().replace(/\s+/g, '_');
    console.log("Rol normalizado para la vista:", this.rolUsuario); 
  }
  
  this.cargarListasJerarquicas();
  this.cargarTiposDeTurnos();
  this.cargarConfiguracionInicial();

  if (this.filters.servicio_id) {
    this.cargarAreas();
  }

  // ========================================================
  // NUEVO: ESCUCHA PARA GENERACIÓN DE PDF (ORQUESTACIÓN)
  // ========================================================
  this._reporteMensualService.solicitarDatos$.subscribe(() => {
    this.actualizarNombresDeFiltros(); 

    // 1. CAMBIO CLAVE: Llamar al servicio para obtener los datos REALES del backend
    // Usamos los filtros actuales para pedir solo lo que corresponde al reporte
    this.turnoService.getReporteMensual(
      this.filters.mes_id, 
      this.filters.gestion, 
      this.filters.servicio_id
    ).subscribe(datosReales => {
      
      const turnosAgrupadosPorDia: any = {};
      
      console.log('--- PROCESANDO DATOS REALES DE LARAVEL PARA PDF ---');
      
      // 2. Procesamos los datos que vienen de la tabla 'turnos_asignados'
      datosReales.forEach(t => {
        // En Laravel, la tabla turnos_asignados tiene el campo 'fecha'
        const fechaKey = t.fecha; 

        if (fechaKey) {
          if (!turnosAgrupadosPorDia[fechaKey]) {
            turnosAgrupadosPorDia[fechaKey] = [];
          }
          
        // 1. Apuntamos a la ruta correcta según tu JSON: t -> usuario -> persona
const persona = t.usuario?.persona || {}; 
const nombreDb = persona.nombre_completo?.trim() || '';

// También extraemos nombres/apellidos por si nombre_completo fallara
const nombres = persona.nombres?.trim() || '';
const apellidos = persona.apellidos?.trim() || '';

let nombreCompleto = 'PERSONAL';

// LÓGICA DE PRIORIDAD
if (nombreDb) {
    // Si existe nombre_completo en la BD, lo usamos (Es lo que buscas)
    nombreCompleto = nombreDb.toUpperCase();
} 
else if (nombres || apellidos) {
    // Si no, intentamos concatenar
    nombreCompleto = `${nombres} ${apellidos}`.replace(/\s+/g, ' ').toUpperCase().trim();
}
else if (t.usuario?.name) {
    // Como último recurso, el nombre de usuario (ej. "lflores")
    nombreCompleto = t.usuario.name.toUpperCase();
}

// 2. Registro en el objeto para el PDF
if (!turnosAgrupadosPorDia[t.fecha]) {
    turnosAgrupadosPorDia[t.fecha] = [];
}

turnosAgrupadosPorDia[t.fecha].push({
    usuario: nombreCompleto, 
    area: t.area?.nombre || 'GENERAL',
    turno: t.turno?.nombre_turno || 'S/T',
    inicio: t.turno?.hora_inicio ? t.turno.hora_inicio.substring(0, 5) : '00:00',
    fin: t.turno?.hora_fin ? t.turno.hora_fin.substring(0, 5) : '00:00'
});



        }
      });

      // 3. Enviamos el objeto final al servicio del PDF
      const datosParaPDF = {
        filtros: {
          servicio: this.filters.servicio_nombre,
          mes: this.filters.mes_nombre,
          gestion: this.filters.gestion, 
          categoria: this.filters.categoria_nombre,
          mes_id: Number(this.filters.mes_id) 
        },
        contenido: turnosAgrupadosPorDia 
      };

      console.log('📦 ENVIANDO DATOS AL SERVICE PDF:', datosParaPDF);
      this._reporteMensualService.enviarDatosParaPDF(datosParaPDF);
    });
  });
}
puedeExportar(): boolean {
    const esAdmin = (this.rolUsuario === 'super_admin' || this.rolUsuario === 'admin');
    return !this.isPeriodoBloqueado || esAdmin;
  }



  
  verificarEstadoBloqueo(): void {
    // Aquí puedes llamar a un método rápido de consulta si lo deseas al cambiar filtros
  }

 toggleBloqueoPeriodo(): void {
  // 1. Verificación de permisos
  if (this.rolUsuario !== 'super_admin' && this.rolUsuario !== 'admin') {
    this.toastr.warning('¡Acceso Restringido!', 'Hospital San Juan de Dios');
    return;
  }

  // 2. Confirmación antes de procesar
  const estadoDestino = !this.isPeriodoBloqueado ? 'BLOQUEAR' : 'DESBLOQUEAR';
  
  Swal.fire({
    title: `¿Confirmar acción: ${estadoDestino}?`,
    text: "Esta acción afectará la disponibilidad de descarga del reporte mensual.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#004d40',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, confirmar'
  }).then((result) => {
    if (result.isConfirmed) {
      // 3. Ejecución si el usuario confirma
      const nuevoEstado = !this.isPeriodoBloqueado;
      this.turnoService.cambiarBloqueoRol(this.filters.servicio_id, this.filters.mes_id, nuevoEstado)
        .subscribe({
          next: (res: any) => {
            this.isPeriodoBloqueado = res.bloqueado; 
            this.toastr.success(res.message, 'Gestión de Cierres');
            this.cdRef.detectChanges();
          },
          error: (err) => {
            console.error(err);
            this.toastr.error('Error al intentar procesar el bloqueo.', 'Error');
          }
        });
    }
  });
}

 exportarPdfMensualBlade(): void {
  // 1. Verificación de seguridad: ¿Están listos los filtros?
  if (!this.filters || !this.filters.servicio_id || !this.filters.mes_id) {
    this.toastr.warning('Por favor, seleccione un Servicio y un Mes antes de exportar.', 'Faltan datos');
    return;
  }

  // 2. Verificación de existencia del servicio
  if (!this.turnoService) {
    console.error("Error: TurnoService no está inyectado correctamente.");
    return;
  }

  // 3. Ejecución segura
  this.turnoService.obtenerPdfReporteMensual(
    this.filters.servicio_id, 
    this.filters.mes_id, 
    this.rolUsuario,
    this.filters.categoria_id
  ).subscribe({
    next: (blob: Blob) => {
      if (blob) {
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
      }
    },
    error: (err) => {
      console.error("Error capturado en la exportación:", err);
      if (err.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'Este reporte mensual ha sido cerrado y bloqueado.',
          confirmButtonColor: '#4B930F'
        });
      } else {
        this.toastr.error('Error al generar el PDF.', 'Servidor');
      }
    }
  });
}


actualizarNombresDeFiltros() {
  // 1. Nombre del Mes
  const mes = this.mesesDisponibles.find(m => m.id == this.filters.mes_id);
  this.filters.mes_nombre = mes ? mes.nombre.toUpperCase() : '';

  // 2. Nombre del Servicio
  const serv = this.servicios.find(s => s.id == this.filters.servicio_id);
  this.filters.servicio_nombre = serv ? serv.nombre : '';

  // 3. Nombre de la Categoría
  const cat = this.categorias.find(c => c.id == this.filters.categoria_id);
  this.filters.categoria_nombre = cat ? cat.nombre : 'TODAS';
}

// En el cambio de Mes
onMesChange(mesId: any) {
  this.filters.mes_id = mesId; // Asegurar el ID
  const mesSeleccionado = this.mesesDisponibles.find(m => m.id == mesId);
  
  if (mesSeleccionado) {
    this.filters.mes_nombre = mesSeleccionado.nombre.toUpperCase();
    
    // 🌟 ENFOQUE SEMANA: Actualizamos el listado de semanas del mes seleccionado
    this.semanasDisponibles = mesSeleccionado.semanas || [];
    
    if (this.semanasDisponibles.length > 0) {
      // Seleccionamos la primera semana del nuevo mes por defecto
      this.filters.semana_id = this.semanasDisponibles[0].id;
      
      // Ejecutamos tu método de recálculo con la fecha de inicio de esta primera semana
      if (this.semanasDisponibles[0].fecha_inicio) {
        this.generarFechasDeLaSemana(this.semanasDisponibles[0].fecha_inicio);
      }
    }
  }
  
  // Al final llamamos a cargarTurnos para actualizar los datos del backend
  this.cargarTurnos();
}

// En el cambio de Filtros (Servicio y Categoría)
onServicioChange() {
  const serv = this.servicios.find(s => s.id == this.filters.servicio_id);
  this.filters.servicio_nombre = serv ? serv.nombre : '';

  const cat = this.categorias.find(c => c.id == this.filters.categoria_id);
  this.filters.categoria_nombre = cat ? cat.nombre : 'TODAS';

  this.cargarTurnos();
}

// Para la Categoría (que usas onCategoriaChange)
onCategoriaChange(event: any) {
  const catSeleccionada = this.categorias.find(c => c.id == this.filters.categoria_id);
  this.filters.categoria_nombre = catSeleccionada ? catSeleccionada.nombre : 'TODAS';
  this.cargarTurnos();
}





// En tu clase TurnosComponent:


cargarListasJerarquicas() {
  this.loading = true;
  this.turnoService.getFiltrosJerarquia().subscribe({
    next: (res) => {
      // 1. Cargamos los servicios que el usuario TIENE PERMITIDO ver
      this.servicios = res.servicios;
      
      // 2. Cargamos las categorías que el usuario PUEDE GESTIONAR
      this.categorias = res.categorias;

      // 3. Si hay servicios disponibles, seleccionamos el primero por defecto
      if (this.servicios.length > 0 && !this.filters.servicio_id) {
        this.filters.servicio_id = this.servicios[0].id;
        this.cargarTiposDeTurnos(); // Refrescamos turnos para ese servicio
      }

      this.loading = false;
      this.cdRef.detectChanges();
    },
    error: (err) => {
      console.error("Error cargando jerarquía:", err);
      this.loading = false;
    }
  });
}

cargarAreas() {
  // Verificamos de nuevo por seguridad
  if (!this.filters.servicio_id) return;

  // Pasamos el argumento requerido por el servicio
  this.turnoService.getAreas(this.filters.servicio_id).subscribe({
    next: (res: any) => {
      this.listaAreas = res.data || res;
      this.cdRef.detectChanges();
    },
    error: (err) => console.error("Error cargando áreas", err)
  });
}

limpiarSemana() {
    Swal.fire({
      title: '¿Limpiar semana?',
      text: "Se eliminarán las asignaciones de la vista actual.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1abc9c',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Lógica para vaciar la semana
        console.log('Semana limpiada');
      }
    });
  }
// En turnos.ts

  abrirRegistroNovedad(turno: any) {
  console.log('Intentando abrir novedad para:', turno);
  if (!turno) {
    alert('Por favor, selecciona primero un turno de la tabla.');
    return;  }

  // 1. Capturamos el ID de la asignación
  const idAsignacion = turno.id_asignacion || turno.id;

  // 2. Cerramos el modal de "Gestionar Asignación" (el de los botones verde/rojo/amarillo)
  this.mostrarModalCRUD = false;

  // 3. Activamos el modo registro en el componente Novedad
  this.idTurnoParaNovedad = idAsignacion;
  this.mostrarModalNovedad = true;

  // 4. Aseguramos que el historial no esté bloqueando la vista
  this.verNovedades = false;

  // Forzamos la detección de cambios para que Angular renderice el @if(modoRegistro)
  this.cdRef.detectChanges();
}

// Y no olvides el método para cuando termine de guardar
onNovedadProcesada() {
  console.log('Novedad guardada con éxito, refrescando tabla...');
  this.mostrarModalNovedad = false;
  this.idTurnoParaNovedad = null;
  this.cargarTurnos(); // Refresca la tabla
}
// Este es el método que te pide el error del compilador
  finalizarNovedad(): void {
    this.verNovedades = false;        // Cierra el historial si estuviera abierto
    this.mostrarModalNovedad = false; // Cierra el formulario de registro
    this.idTurnoParaNovedad = null;   // Limpia el ID seleccionado
    this.cargarTurnos();              // Refresca la tabla de turnos
  }


  
  cargarCategorias() {
    this.turnoService.getCategorias().subscribe({
      next: (res: any) => {
        this.categorias = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err: any) => console.error("Error categorías", err)
    });
  }
cargarTiposDeTurnos() {
  // Verificamos que tengamos un servicio seleccionado
  const servicioId = this.filters.servicio_id;
  if (!servicioId) return;

  // Usamos el método que ya creaste en tu servicio para obtener turnos por servicio
  this.turnoService.getTurnosPorServicio(servicioId).subscribe({ 
    next: (res: any) => {
      // Seteamos la lista con los turnos filtrados que vienen de la configuración
      this.listaTurnos = res.data || res;
      
      console.log("Turnos filtrados por servicio cargados:", this.listaTurnos);
      this.cdRef.detectChanges();
    },
    error: (err) => {
      console.error("Error al cargar turnos del servicio", err);
    }
  });
}


// 1. Carga inicial (Corre una sola vez al abrir el componente)
cargarConfiguracionInicial() {
  this.loading = true;
  this.turnoService.getConfiguracionCalendario().subscribe((resCal: any) => {
    const data = resCal.data || resCal;
    this.todasLasGestiones = data.gestiones; // Guardamos todo el árbol en una variable nueva

    // Buscamos el año 2026 (o el que tengas en filters.gestion)
    const gestionActual = this.todasLasGestiones?.find((g: any) => g.año == this.filters.gestion);
    
    if (gestionActual) {
      this.mesesDisponibles = gestionActual.meses;
      // Buscamos el mes que el servidor dice que es el "actual"
      const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
      
      if (mesActual) {
        this.filters.mes_id = mesActual.id;
        this.semanasDisponibles = mesActual.semanas;
        this.filters.semana_id = this.semanasDisponibles[0]?.id;
        //carga la semana inicial de las fechas 
        if (this.semanasDisponibles[0]?.fecha_inicio) {
         this.generarFechasDeLaSemana(this.semanasDisponibles[0].fecha_inicio);
  }

      }
    }
    this.cargarTurnos();
    this.loading = false;
  });
}

// 2. Nueva función: Se dispara cuando el usuario cambia el año en el <select>
onCambioGestion() {
  const gestion = this.todasLasGestiones.find((g: any) => g.año == this.filters.gestion);
  if (gestion) {
    this.mesesDisponibles = gestion.meses;
    // Al cambiar de año, seleccionamos el primer mes (Enero) por defecto
    if (this.mesesDisponibles.length > 0) {
      this.onCambioMes(this.mesesDisponibles[0].id);
    }
  }
}


  

cargarTurnos() {

  // 1. Validación de seguridad existente
    if (!this.filters.servicio_id || !this.filters.semana_id) return;
    this.cargando = true;
    this.cdRef.detectChanges();

    // =========================================================================
    // 🌟 ENFOQUE SEMANA: Buscamos la semana activa para actualizar los números
    // =========================================================================
    const semanaSeleccionada = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
    if (semanaSeleccionada && semanaSeleccionada.fecha_inicio) {
      this.generarFechasDeLaSemana(semanaSeleccionada.fecha_inicio);
    }
    // =========================================================================

    // 2. Tu petición HTTP al servicio se mantiene exactamente igual
    this.turnoService.getEquipoPorFiltros(this.filters.servicio_id, this.filters.categoria_id, this.filters.semana_id)
      .subscribe({
        next: (res: any) => {
          this.personalAgrupado = res.equipo_visible || res.data || res;
          this.cargando = false;
          this.cdRef.detectChanges();
        },
        error: (err: any) => { 
          this.cargando = false; 
          this.cdRef.detectChanges(); 
        }
      });
}

  // --- LÓGICA DE MOVIMIENTO (DRAG & DROP) ---

  onTurnoMovido(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) return;

    const origen = event.previousContainer.data;
    const destino = event.container.data;
    const turno = event.item.data;

    this.datosTemporal = {
      payload: {
        turno_id: turno.id_asignacion || turno.id,
        nuevo_usuario_id: destino.usuario_id,
        nueva_fecha: this.obtenerFechaReal(destino.fecha)
      },
      origenNombre: origen.usuario_nombre,
      destinoNombre: destino.usuario_nombre,
      fechaDestino: destino.fecha,
      nombreTurno: turno.nombre_turno,
      esIntercambio: !!destino.usuario_id 
    };

    if (!this.datosTemporal.payload.turno_id) return;

    this.mostrarConfirmacion = true; 
  }

confirmarMovimiento() {
  this.cargando = true;

  this.turnoService.actualizarPosicion(this.datosTemporal.payload).subscribe({
    next: (res: any) => {
      // 1. Preparamos los nombres con negritas para el innerHTML
      const nombreOrigen = `<strong class="badge-persona">${this.datosTemporal.origenNombre}</strong>`;
      const nombreDestino = `<strong class="badge-persona">${this.datosTemporal.destinoNombre}</strong>`;
      
      // 2. Determinamos el tipo de acción para el mensaje
      const accion = res.intercambio ? 'intercambió' : 'movió';
      const conector = res.intercambio ? 'con' : 'a la posición de';

      // 3. Insertamos al principio del arreglo (unshift)
      this.historialCambios.unshift({
        texto: `Se ${accion} el turno de ${nombreOrigen} ${conector} ${nombreDestino}`,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        fecha_movimiento: new Date(),
        tipo: res.intercambio ? 'swap' : 'move' // Utilidad para iconos si decides usarlos
      });

      // 4. Limpieza y refresco
      this.cerrarConfirmacion();
      this.cargarTurnos();
      this.cargando = false;
      
      // Opcional: Limitar el historial a los últimos 20 registros para no saturar la memoria
      if (this.historialCambios.length > 20) {
        this.historialCambios.pop();
      }
    },
    error: (err: any) => {
      this.cargando = false;
      console.error("Error en el movimiento:", err);
      alert("No se pudo completar el movimiento: " + (err.error?.message || 'Error del servidor'));
    }
  });
}
  cancelarMovimiento() {
    this.cerrarConfirmacion();
  }

  cerrarConfirmacion() {
    this.mostrarConfirmacion = false;
    this.datosTemporal = {};
  }


onReplicarMes() {
  Swal.fire({
    title: '¿Replicar esta semana?',
    text: "La programación de esta semana se copiará a todo el mes actual.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1abc9c',
    confirmButtonText: 'Sí, copiar a todo el mes'
  }).then((result) => {
    if (result.isConfirmed) {
      this.cargando = true;
      this.turnoService.replicarSemanaEnMes(
        this.filters.servicio_id, 
        this.filters.mes_id, 
        this.filters.semana_id
      ).subscribe({
        next: () => {
          this.toastr.success("La semana se ha replicado exitosamente.");
          this.cargarTurnos();
          this.cargando = false;
        },
        error: (err) => {
          this.cargando = false;
          this.toastr.error("Error al replicar: " + (err.error?.message || 'Intente nuevamente'));
        }
      });
    }
  });
}

async capturarPantalla() {
  const doc = new jsPDF('l', 'mm', 'a4'); // Orientación horizontal (Landscape)
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. CONFIGURACIÓN DE ENCABEZADO (Estilo profesional)
  doc.setFontSize(16);
  doc.setTextColor(40, 167, 69); // Verde médico / institucional
  doc.setFont("helvetica", "bold");
  
  const nombreServicio = this.servicios.find(s => s.id == this.filters.servicio_id)?.nombre || 'SERVICIO';
  const titulo = `ROL DE TURNOS: ${nombreServicio}`.toUpperCase();
  doc.text(titulo, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  
  const semanaActual = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
  const periodo = `Periodo: ${semanaActual?.fecha_inicio || ''} al ${semanaActual?.fecha_fin || ''}`;
  doc.text(periodo, pageWidth / 2, 22, { align: 'center' });

  // Línea decorativa verde
  doc.setDrawColor(40, 167, 69);
  doc.setLineWidth(1);
  doc.line(15, 25, pageWidth - 15, 25);

  // 2. PREPARACIÓN DE DATOS PARA LA TABLA DEL PDF
  const bodyData = this.personalAgrupado.map((p: any) => {
      // MODIFICACIÓN CLAVE: Agregamos el Tipo de Salario debajo del Nombre con un salto de línea
      const nombreYSalario = `${p.usuario_nombre.toUpperCase()}\n[${p.tipo_salario || 'No definido'}]`;
      const fila = [nombreYSalario];
      
      this.diasSemana.forEach(dia => {
          const fechaBuscada = this.obtenerFechaReal(dia);
          const turnosDelDia = p.turnos?.filter((t: any) => t.fecha === fechaBuscada) || [];

          if (turnosDelDia.length > 0) {
              const textoCeldas = turnosDelDia.map((t: any) => {
                  let horarioStr = '';
                  if (t.horario && !t.horario.includes('2026')) {
                      horarioStr = t.horario;
                  } else {
                      const inicio = t.hora_inicio?.length > 10 ? t.hora_inicio.slice(11, 16) : t.hora_inicio?.slice(0, 5);
                      const fin = t.hora_fin?.length > 10 ? t.hora_fin.slice(11, 16) : t.hora_fin?.slice(0, 5);
                      horarioStr = `${inicio || '--:--'} - ${fin || '--:--'}`;
                  }

                  const nombreServicioStr = t.area_nombre || t.servicio_nombre || 'GENERAL';
                  return `${t.nombre_turno.toUpperCase()}\n(${nombreServicioStr.toUpperCase()})\n${horarioStr}`;
              }).join('\n\n');

              fila.push(textoCeldas);
          } else {
              fila.push('-');
          }
      });

      // Se calculan los totales semanales
      const diasTrabajados = this.calcularDiasTrabajados(p);
      const horasTotales = this.calcularTotalHoras(p);

      // Insertamos los totales en sus respectivas celdas
      fila.push(`${diasTrabajados}`);
      fila.push(`${horasTotales}h`);
      
      return fila;
  });

  // 3. GENERACIÓN DE TABLA AUTOMÁTICA
  autoTable(doc, {
    startY: 30,
    // MODIFICACIÓN CLAVE: Añadidas las cabeceras de DÍAS y HORAS para que coincidan con los datos de las columnas
    head: [['PERSONAL / SALARIO', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM', 'DÍAS', 'HORAS']],
    body: bodyData,
    theme: 'grid',
    headStyles: { 
      fillColor: [40, 167, 69], 
      halign: 'center', 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', halign: 'left' }, // Ajuste para el nombre y tipo de salario
      8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, // Columna DÍAS
      9: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [0, 123, 255] } // Columna HORAS en azul
    },
    styles: { 
      fontSize: 8, 
      halign: 'center', 
      valign: 'middle', 
      overflow: 'linebreak',
      cellPadding: 2
    },
    margin: { left: 15, right: 15 }
  });

  // 4. PIE DE PÁGINA Y FIRMAS
  const finalY = (doc as any).lastAutoTable.finalY + 25;

  doc.setDrawColor(180);
  doc.line(15, finalY, 75, finalY);
  doc.setFontSize(9);
  doc.setTextColor(50);
  doc.text(`Generado por: ${this.alias}`, 15, finalY + 5);
  doc.text(this.rolUsuario.toUpperCase(), 15, finalY + 10);

  doc.setFontSize(8);
  doc.setTextColor(150);
  const fechaGeneracion = `Impreso el: ${new Date().toLocaleString()}`;
  doc.text(fechaGeneracion, pageWidth - 15, finalY + 15, { align: 'right' });

  // 5. DESCARGA DEL ARCHIVO
  doc.save(`Reporte_Turnos_${nombreServicio.replace(/\s+/g, '_')}.pdf`);
}


calcularTotalHoras(p: any): number {
  if (!p.turnos || p.turnos.length === 0) return 0;

  // Sumamos la propiedad duracion_horas de cada turno asignado
  return p.turnos.reduce((acc: number, turno: any) => {
    // Validamos que el campo sea un número para evitar errores de suma
    const horas = Number(turno.duracion_horas) || 0;
    return acc + horas;
  }, 0);
}


onRotarMensual() {
  // Apuntamos a tu variable real de la grilla: personalAgrupado
  if (this.personalAgrupado && this.personalAgrupado.length > 0) {
    this.personalAgrupado.forEach((p: any) => p.seleccionadoParaRotar = true);
  }
}

// 2. Helper para saber si todos en la lista están marcados
todosSeleccionados(): boolean {
  if (!this.personalAgrupado || this.personalAgrupado.length === 0) return false;
  return this.personalAgrupado.every((p: any) => p.seleccionadoParaRotar);
}

// 3. Permite marcar/desmarcar todos con el checkbox principal
toggleTodos(event: any) {
  const checked = event.target.checked;
  this.personalAgrupado.forEach((p: any) => p.seleccionadoParaRotar = checked);
}

// 4. Extrae únicamente los IDs de los usuarios que se quedaron marcados
obtenerIdsARotar(): number[] {
  if (!this.personalAgrupado) return [];
  return this.personalAgrupado
    .filter((p: any) => p.seleccionadoParaRotar)
    .map((p: any) => p.usuario_id); // Usa tu propiedad usuario_id estándar
}

// 5. Procesa la lógica final y envía el objeto Payload al Backend.
onRotarMensualSeleccionado() {
  const servicioId = this.filters.servicio_id;
  const mesActualId = this.filters.mes_id;
  const gestionActual = this.filters.gestion; 
  const usuariosARotar = this.obtenerIdsARotar(); // [3, 4, 6] (Excluye correctamente a los desmarcardos)

  let mesDestinoId: number;
  let gestionDestino: number = Number(gestionActual);

  // Lógica de salto de mes y año
  if (Number(mesActualId) === 12) {
    mesDestinoId = 1; 
    gestionDestino = Number(gestionActual) + 1; 
  } else {
    mesDestinoId = Number(mesActualId) + 1;
  }

  this.cargando = true;
  
  // Agrupamos todo en un único objeto Payload para enviar al backend
  const payload = {
    servicio_id: servicioId,
    mes_id: mesActualId,
    mes_destino: mesDestinoId,
    gestion_destino_id: gestionDestino, // <-- Agregado para que Laravel sepa si cambió de año
    usuarios_ids: usuariosARotar
  };

  this.turnoService.rotarPersonalMensual(payload).subscribe({
  next: (res: any) => {
    alert(`¡Éxito! El personal seleccionado ha sido rotado correctamente.`);

    // Actualizamos los filtros para "viajar" al nuevo mes de forma segura
    this.filters.mes_id = mesDestinoId;
    
    // CORRECCIÓN: Asignamos el número directamente sin convertirlo a String
    this.filters.gestion = gestionDestino; 

    // Forzamos la actualización de semanas disponibles para el nuevo mes
    this.onCambioMes(mesDestinoId); 
    
    this.cargando = false;
  },
  error: (err: any) => {
    // ... resto de tu código de error
  }
});
}


// Se renombra para que coincida con el (click)="vaciarCalendario()" de tu HTML
 
  vaciarCalendario() {
    if (confirm("¿Estás seguro de vaciar todos los turnos del mes?")) {
      this.turnoService.vaciarMes(this.filters.servicio_id, this.filters.mes_id)
        .subscribe({
          next: () => {
            alert("Calendario vaciado.");
            this.cargarTurnos();
          },
          error: (err: any) => console.error("Error al vaciar:", err)
        });
    }
  }


  
 obtenerTurnosAsignados(usuario: any, nombreDiaColumna: string): any[] {
    if (!usuario || !usuario.turnos) return []; // Siempre devolver array

    const fechaBuscada = this.obtenerFechaReal(nombreDiaColumna);
    const asignaciones = usuario.turnos.filter((t: any) => t.fecha === fechaBuscada);

    return asignaciones.map((asignacion: any) => ({
        ...asignacion,
        nombre_turno: asignacion.nombre_turno || asignacion.turno?.nombre_turno || 'S/N',
        hora_inicio: asignacion.hora_inicio || '--:--',
        hora_fin: asignacion.hora_fin || '--:--',
        area_nombre: asignacion.area_nombre || 'GENERAL'
    }));
}

  obtenerFechaReal(nombreDia: string): string {
    const semanaActual = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
    if (!semanaActual) return '';

    const partes = semanaActual.fecha_inicio.split('-');
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 12, 0, 0);
    
    const indiceDia = this.diasSemana.indexOf(nombreDia);
    if (indiceDia !== -1) {
      fecha.setDate(fecha.getDate() + indiceDia);
    }

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    return `${año}-${mes}-${dia}`;
  }
generarFechasDeLaSemana(fechaInicio: string) {
    this.fechasRealesDeLaSemana = [];
    for (let i = 0; i < 7; i++) {
        // Usamos la estrategia de separar por '-' para evitar problemas de zonas horarias locales
        const partes = fechaInicio.split('-');
        const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        fecha.setDate(fecha.getDate() + i);
        this.fechasRealesDeLaSemana.push(fecha.toISOString().split('T')[0]);
    }
}

// 🌟 Función auxiliar para extraer el número del día (ej: de "2026-05-04" saca "4")
obtenerNumeroDia(fechaStr: string): string {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-'); // [año, mes, dia]
    return parseInt(partes[2], 10).toString(); // Remueve el cero inicial (ej: "04" -> "4")
}

cerrarTodosLosModales() {
  this.mostrarModal = false;
  this.mostrarModalCRUD = false;
  this.mostrarModalCalendario = false;
  
  // Limpiamos datos para que el siguiente clic no tenga "residuos"
  this.turnoSeleccionado = null;
  this.fechasSeleccionadas = [];
  this.esMensual = false;
}



// 2. Método para Actualizar
confirmarActualizacion() {
  const id = this.turnoSeleccionado.id_asignacion; // El ID de la tabla turnos_asignados
  const data = {
    turno_id: this.turnoSeleccionado.turno_id,
    area_id: this.turnoSeleccionado.area_id,
    observacion: this.turnoSeleccionado.observacion
  };

  this.turnoService.actualizarTurnoAsignado(id, data).subscribe({
    next: () => {
      this.mostrarModalCRUD = false;
      this.cargarTurnos(); // Recarga la tabla para ver el cambio
    }
  });
}

// 3. Método para Eliminar
eliminarTurno() {
  if (confirm('¿Estás seguro de eliminar esta asignación?')) {
    this.turnoService.eliminarTurnoAsignado(this.turnoSeleccionado.id_asignacion).subscribe({
      next: () => {
        this.mostrarModalCRUD = false;
        this.cargarTurnos();
      }
    });
  }
}



  onFilterChange() { 
    this.cargarTiposDeTurnos();
    this.cargarTurnos(); }

 onCambioMes(mesId: any) {
  // Aseguramos que el filtro tenga el ID correcto
  this.filters.mes_id = mesId;
  
  const mes = this.mesesDisponibles.find(m => m.id == mesId);
  this.semanasDisponibles = mes ? mes.semanas : [];
  
  if (this.semanasDisponibles.length > 0) {
    // Seleccionamos la primera semana del nuevo mes
    this.filters.semana_id = this.semanasDisponibles[0].id;
    this.cargarTurnos();
  }
}

  abrirModalAsignar(personal: any, dia: string) {
  
  if (personal.estado == 0) {
    this.mostrarAvisoInactivo();
    return;
  }

  // 2. Solo extraemos/aseguramos el estado y mantenemos el resto del objeto
  this.personalSeleccionado = { 
    ...personal, 
    estado: personal.estado ?? 1 
  };
    // 1. Limpieza y preparación de datos
  
  this.personalSeleccionado = { ...personal };
  this.diaSeleccionado = dia;
  this.fechaUnica = dia;
  
  // Reseteos importantes
  this.turnoIdSeleccionado = null;
  this.areaIdSeleccionado = null;
  this.esMensual = false;
  this.fechasSeleccionadas = []; 
  this.mostrarModalCRUD = false; 

  // 2. Carga de datos necesarios (Áreas y Turnos Filtrados)
  const servicioId = this.filters.servicio_id;

  if (servicioId) {
    // Carga de Áreas para el servicio
    this.turnoService.getAreas(servicioId).subscribe({
      next: (res: any) => {
        this.listaAreas = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err) => console.error("Error al cargar áreas:", err)
    });

    // CARGA DE TURNOS VINCULADOS (Eliminamos el if de length === 0)
    // Esto garantiza que si cambias de servicio, los turnos se refresquen siempre
    this.turnoService.getTurnosPorServicio(servicioId).subscribe({
      next: (res: any) => {
        this.listaTurnos = res.data || res;
        console.log("Turnos específicos cargados para el modal:", this.listaTurnos);
        this.cdRef.detectChanges();
      },
      error: (err) => console.error("Error al cargar turnos vinculados:", err)
    });
  }
  // 3. Abrir el modal de asignación
  this.mostrarModal = true;
}



mostrarAvisoInactivo() {
  Swal.fire({
    title: 'Personal Inactivo',
    text: 'Este profesional no puede recibir turnos porque su vinculación está desactivada.',
    icon: 'warning',
    confirmButtonColor: '#20c997'
  });
}
abrirCalendario() {
    this.mostrarModalCalendario = true;
    // No cerramos 'mostrarModal' para que se vea de fondo, 
    // pero el 'appendTo="body"' del HTML hará que el calendario flote encima.
}




// Función para procesar los días elegidos
aceptarDias() {
    if (this.fechasSeleccionadas && this.fechasSeleccionadas.length > 0) {
        // Cerramos el calendario (esto lo quita de la vista superior)
        this.mostrarModalCalendario = false;
        
        // Activamos la bandera para que el modal verde muestre el conteo de días
        this.esMensual = true;
        
        // Mantenemos o reabrimos el modal de asignación
        this.mostrarModal = true;
    }
}


abrirOpcionesTurno(turno: any, personal: any) {
    this.cerrarTodosLosModales();
    
    this.turnoSeleccionado = { ...turno }; // Clonamos el objeto
    this.personalSeleccionado = personal;
    this.mostrarModalCRUD = true; 
}

  cerrarModal() {
  this.mostrarModal = false;
  this.mostrarModalCRUD = false;
  this.mostrarModalCalendario = false;
  
  // Limpieza de datos para evitar errores de 'null' en el HTML
  this.turnoSeleccionado = null;
  this.fechasSeleccionadas = [];
  this.esMensual = false;
  
  // Opcional: Forzar detección de cambios si el modal no se cierra visualmente
  this.cdRef.detectChanges();
}

//cuantos dias trabajo por mes
calcularDiasTrabajados(usuario: any): number {
  if (!usuario.turnos || !Array.isArray(usuario.turnos)) return 0;
  
    // Usamos Set para evitar contar doble si hubiera algún error de duplicados por fecha
  const fechasUnicas = new Set(usuario.turnos.map((t: any) => t.fecha));
  return fechasUnicas.size;
}

// 1. Definir una estructura para el resumen

guardarAsignacion() {
    // AHORA: Solo el turno es estrictamente obligatorio
    if (!this.turnoIdSeleccionado) {
        this.toastr.warning('Por favor seleccione al menos un turno');
        return;
    }

    let fechasAEnviar: string[] = [];

    // Lógica de fechas (Mensual o Individual)
    if (this.esMensual && this.fechasSeleccionadas) {
        fechasAEnviar = this.fechasSeleccionadas.map(date => 
            formatDate(date, 'yyyy-MM-dd', 'en-US')
        );
    } else {
        const fechaBase = this.obtenerFechaReal(this.diaSeleccionado);
        fechasAEnviar = [formatDate(fechaBase, 'yyyy-MM-dd', 'en-US')];
    }

    // Payload para Laravel
    const payload = {
        usuario_id: this.personalSeleccionado.usuario_id,
        turno_id: this.turnoIdSeleccionado,
        // Si no hay área seleccionada, enviamos null para que sea "General"
        area_id: this.areaIdSeleccionado || null, 
        fechas_multiples: fechasAEnviar,
        estado: 'programado',
        observacion: '' 
    };

    this.turnoService.asignarTurno(payload).subscribe({
        next: (res: any) => {
            this.toastr.success("Turnos asignados correctamente", "Éxito", {
                timeOut: 2000,
                progressBar: true 
            });
            this.cerrarModal();
            this.cargarTurnos(); // Importante para refrescar la tabla
        },
        error: (err: any) => {
            console.error("Error al guardar:", err);
            this.toastr.error(err.error?.message || "Error al procesar la asignación", "Error", {
                timeOut: 6000,
                progressBar: true,
                enableHtml: true
            });
        }
    });
}


// ... dentro de tu clase TurnosComponent

resumenMensual: ResumenMensual[] = [];
toggleVistaMensual() {
    this.mostrarVistaMensual = !this.mostrarVistaMensual;
    
    if (this.mostrarVistaMensual) {
      // Aquí podrías cargar datos específicos del mes si fuera necesario
      console.log('Cambiando a vista mensual...');
    } else {
      // Lógica para volver a la vista semanal
      console.log('Cambiando a vista semanal...');
    }
  }
 
  
exportarPDFSemanal() {
  // 1. Extraemos los IDs de tu objeto 'filters'
  const semanaId = this.filters.semana_id;
  const servicioId = this.filters.servicio_id;
  const categoriaId = this.filters.categoria_id;

  // 2. Validación básica
  if (!semanaId || !servicioId || !categoriaId) {
    this.toastr.warning('Por favor seleccione Servicio, Categoría y Semana', 'Atención');
    return;
  }

  // 3. Construimos la URL usando el environment que ya importaste
  const url = `${environment.apiUrl}/reportes/semanal/${semanaId!}?servicio_id=${servicioId!}&categoria_id=${categoriaId!}`;

  // 4. Petición HTTP para obtener el Blob
  this.http.get(url, { responseType: 'blob' }).subscribe({
    next: (res: Blob) => {
      const fileURL = URL.createObjectURL(res);
      window.open(fileURL, '_blank');
    },
    error: (err: any) => {
      console.error('Error al generar la vista previa', err);
      this.toastr.error('No se pudo generar el reporte', 'Error');
    }
  });
}



exportarPDFMensual() {
  // 1. Añadimos la validación para asegurar que exista la categoría seleccionada
  if (!this.filters.servicio_id || !this.filters.mes_id || !this.filters.categoria_id) {
    this.toastr.warning('Seleccione servicio, mes y categoría antes de exportar', 'Atención');
    return;
  }

  this.loading = true;

  // 2. Pasamos 'this.filters.categoria_id' como tercer parámetro a tu servicio
  this.turnoService.getResumenMensual(this.filters.servicio_id, this.filters.mes_id, this.filters.categoria_id).subscribe({
    next: (response) => {
      const listaPersonal = response.data;

      if (!listaPersonal || listaPersonal.length === 0) {
        this.toastr.info('No hay datos disponibles para este mes/servicio/categoría', 'Información');
        this.loading = false;
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // =========================================================================
      // ENCABEZADO INSTITUCIONAL
      // =========================================================================
      doc.setFillColor(6, 80, 34); // #065022 (Verde Oscuro Hospital)
      doc.rect(0, 0, 210, 4, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(6, 80, 34); 
      doc.text('REPORTE MENSUAL DE ASISTENCIA Y HORAS', 14, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Institución: Hospital San Juan de Dios`, 14, 25);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 30);

      const rows = listaPersonal.map((p: any) => [
        p.usuario_nombre.toUpperCase(),
        p.categoria_nombre.toUpperCase(),
        `${p.dias_trabajados} días`,
        `${p.total_horas} hrs`
      ]);

      // =========================================================================
      // GENERACIÓN DE TABLA CON DISTRIBUCIÓN HORIZONTAL AGRESIVA
      // =========================================================================
      autoTable(doc, {
        startY: 36,
        head: [['PERSONAL', 'CATEGORÍA', 'DÍAS\nTRAB.', 'TOTAL\nHORAS']], 
        body: rows,
        theme: 'grid',
        
        styles: { 
          fontSize: 9, 
          cellPadding: 3.5,             
          valign: 'middle',             
          font: 'helvetica',
          overflow: 'linebreak'         
        },

        headStyles: { 
          fillColor: [6, 80, 34], 
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },

        columnStyles: {
          0: { cellWidth: 105, halign: 'left' },   
          1: { cellWidth: 37, halign: 'center' },  
          2: { cellWidth: 20, halign: 'center' },  
          3: { cellWidth: 20, halign: 'center' }   
        },

        alternateRowStyles: {
          fillColor: [245, 249, 246]
        }
      });

      // Puedes concatenar también la categoría en el nombre del archivo final si gustas
      doc.save(`Reporte_Mensual_${this.filters.mes_id}_Cat_${this.filters.categoria_id}.pdf`);
      this.loading = false;
    },
    error: (err) => {
      console.error('Error en el reporte:', err);
      this.toastr.error('Error al conectar con el servidor', 'Error');
      this.loading = false;
    }
  });
}





alGuardarNovedad() {
  // 1. Cambiamos el nombre al que realmente existe en tu componente
  console.log('Refrescando datos para la semana:', this.filters.semana_id);
  this.cargarListasJerarquicas(); 
  
  // 2. Cerramos el panel/modal
  this.mostrarNovedades = false;
  this.turnoSeleccionado = null;

  // 3. Notificación (Asegúrate de que arriba diga: private _toastr = inject(ToastrService);)
  this.toastr.success('Asignación actualizada', '¡Éxito!', {
    timeOut: 3000,
    progressBar: true,
    progressAnimation: 'increasing',
    toastClass: 'ngx-toastr hospital-green-toast' 
  });
}

rotarPersonalEstructuraFija(): void {
  // 1. Filtrar los usuarios seleccionados por checkbox en el modal (Los que van a rotar)
  const elegidos = this.personalAgrupado.filter(p => p.seleccionadoParaRotar);

  // Validación de seguridad básica en el cliente
  if (elegidos.length < 2) {
    this.toastr.warning("Selecciona al menos a 2 personas en el modal para poder rotar.");
    return;
  }

  this.cargando = true;

  // 2. Calculamos el mes destino. 
  // NOTA: Si en tu componente ya tenés una variable "this.mesDestinoId" que viene de un select del modal, usá esa.
  // Si no, por defecto le sumamos 1 de forma segura al mes actual de tus filtros:
  const mesDestinoCalculado = Number(this.filters.mes_id) + 1;

  // 3. Preparamos el Payload mapeando correctamente lo que procesará Laravel
  const payload = {
    servicio_id: this.filters.servicio_id,
    mes_id: this.filters.mes_id,                 // Mes Origen (Junio)
    mes_destino: mesDestinoCalculado,            // Mes Destino (Julio) -> Enviado explícitamente
    gestion: this.filters.gestion,               // Año (Ej: 2026)
    
    // Mapeamos todo el personal, pero indicando con un flag quién se mueve y quién no
    distribucion: this.personalAgrupado.map(p => ({
      usuario_id: p.usuario_id,
      seleccionado: p.seleccionadoParaRotar ? true : false, // El backend leerá esto para separar Bloque A y B
      turnos_asignados_ids: p.turnos ? p.turnos.map((t: any) => t.id_asignacion || t.id) : []
    }))
  };

  // 4. ¡EJECUTAMOS LA PETICIÓN AL BACKEND CORRECTAMENTE! 🚀
  this.turnoService.rotarPersonalMensual(payload).subscribe({
    next: (res: any) => {
      this.toastr.success("¡Personal rotado con éxito!");
      this.cerrarTodosLosModales();
      
      // Viaja al backend a buscar el nuevo mes cargado con los datos listos para pintar
      this.cargarTurnos(); 
      this.cargando = false;
    },
    error: (err: any) => {
      this.cargando = false;
      // Mostramos el mensaje exacto que devuelva el catch de Laravel si algo falla (ej: falta de semanas)
      this.toastr.error(err.error?.message || "No se pudo procesar la rotación.");
    }
  });
}
 }
