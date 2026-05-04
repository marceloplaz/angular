import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DatePickerModule } from 'primeng/datepicker';

import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { NovedadComponent } from '../novedad/novedad';
import { DragDropModule, CdkDragDrop,  CdkDropListGroup,  CdkDropList,  CdkDrag,   } from '@angular/cdk/drag-drop';
import { CdkDragPlaceholder } from '@angular/cdk/drag-drop'; //relativo para pdf
import { jsPDF } from 'jspdf';// imagen de pdf
import autoTable from 'jspdf-autotable';
import { formatDate } from '@angular/common';
import { DialogModule } from 'primeng/dialog'; 
import { ToastrService } from 'ngx-toastr'; 
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

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
    CdkDropListGroup, 
    CdkDropList, 
    CdkDrag, 
    
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
    semana_id: null as any 
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
 


ngOnInit() {
  const nombreGuardado = localStorage.getItem('usuario_nombre');
  const rolGuardado = localStorage.getItem('usuario_rol');

  if (nombreGuardado) { this.alias = nombreGuardado; }
  if (rolGuardado) { this.rolUsuario = rolGuardado; }
  
  //this.cargarCategorias();
  this.cargarListasJerarquicas();
  this.cargarTiposDeTurnos();
  this.cargarConfiguracionInicial();

  // Llamada correcta: verificamos si hay servicio seleccionado primero
  if (this.filters.servicio_id) {
    this.cargarAreas();
  }
} // <-- Fin de ngOnInit



  


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
    if (!this.filters.servicio_id || !this.filters.semana_id) return;
    this.cargando = true;
    this.cdRef.detectChanges();

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
  doc.setTextColor(40, 167, 69); // Verde médico
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


// 2. PREPARACIÓN DE DATOS PARA LA TABLA DEL PDF
// Usamos solo personalAgrupado para evitar el error de propiedad inexistente
const bodyData = this.personalAgrupado.map((p: any) => {
    // Iniciamos la fila con el nombre
    const fila = [p.usuario_nombre.toUpperCase()];
    
    this.diasSemana.forEach(dia => {
        const fechaBuscada = this.obtenerFechaReal(dia);
        
        // Buscamos TODOS los turnos del usuario para esta fecha
        // Importante: No filtramos por servicio aquí para que salgan todos en el PDF
        const turnosDelDia = p.turnos?.filter((t: any) => t.fecha === fechaBuscada) || [];

        if (turnosDelDia.length > 0) {
            // Mapeamos los múltiples turnos (esto arregla lo de Doña Acebo)
            const textoCeldas = turnosDelDia.map((t: any) => {
                let horarioStr = '';
                if (t.horario && !t.horario.includes('2026')) {
                    horarioStr = t.horario;
                } else {
                    const inicio = t.hora_inicio?.length > 10 ? t.hora_inicio.slice(11, 16) : t.hora_inicio?.slice(0, 5);
                    const fin = t.hora_fin?.length > 10 ? t.hora_fin.slice(11, 16) : t.hora_fin?.slice(0, 5);
                    horarioStr = `${inicio || '--:--'} - ${fin || '--:--'}`;
                }

                // Agregamos el nombre del servicio/área (esto identifica si es Ginecología o Cirugía)
                const nombreServicio = t.area_nombre || t.servicio_nombre || 'GENERAL';
                
                return `${t.nombre_turno.toUpperCase()}\n(${nombreServicio.toUpperCase()})\n${horarioStr}`;
            }).join('\n\n'); // Doble salto para separar los dos turnos

            fila.push(textoCeldas);
        } else {
            fila.push('-');
        }
    });

    // Agregamos los totales de Días y Horas
    fila.push(`${this.calcularDiasTrabajados(p)}`);
    fila.push(`${this.calcularTotalHoras(p)}h`);
    
    return fila;
});



  // 3. GENERACIÓN DE TABLA AUTOMÁTICA
  autoTable(doc, {
    startY: 30,
    head: [['PERSONAL', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM', 'TOTAL']],
    body: bodyData,
    theme: 'grid',
    headStyles: { 
      fillColor: [40, 167, 69], 
      halign: 'center', 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' }, // Columna de nombres
      8: { halign: 'center', fontStyle: 'bold', textColor: [0, 123, 255] } // Columna de horas
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

  // Línea para firma del responsable
  doc.setDrawColor(180);
  doc.line(15, finalY, 75, finalY);
  doc.setFontSize(9);
  doc.setTextColor(50);
doc.text(`Generado por: ${this.alias}`, 15, finalY + 5); // DEBE SER EL NOMBRE
doc.text(this.rolUsuario.toUpperCase(), 15, finalY + 10); // DEBE SER EL ROL

  // Fecha y hora de impresión (esquina inferior derecha)
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
  const servicioId = this.filters.servicio_id;
  const mesActualId = this.filters.mes_id;
  const gestionActual = this.filters.gestion; // 2026

  let mesDestinoId: number;
  let gestionDestino: number = gestionActual;

  // Lógica de salto de mes y año
  if (mesActualId === 12) {
    mesDestinoId = 1; // De Diciembre saltamos a Enero
    gestionDestino = Number(gestionActual) + 1; // Saltamos a 2027
  } else {
    mesDestinoId = Number(mesActualId) + 1;
  }

  // Confirmación al usuario
  if (confirm(`¿Deseas rotar circularmente el personal al mes ${mesDestinoId} de ${gestionDestino}?`)) {
    this.cargando = true;
    
    this.turnoService.rotarPersonalMensual(servicioId, mesActualId, mesDestinoId).subscribe({
      next: (res: any) => {
        alert(`¡Éxito! Personal rotado correctamente.`);

        // Actualizamos los filtros para "viajar" al nuevo mes
        this.filters.mes_id = mesDestinoId;
        this.filters.gestion = gestionDestino;

        // Forzamos la actualización de semanas disponibles para el nuevo mes
        this.onCambioMes(mesDestinoId); 
        
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        console.error("Error en la rotación:", err);
        alert("No se pudo rotar: " + (err.error?.message || 'Error del servidor'));
      }
    });
  }
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
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + i);
        this.fechasRealesDeLaSemana.push(fecha.toISOString().split('T')[0]);
    }
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


abrirCalendario() {
    this.mostrarModalCalendario = true;
    // No cerramos 'mostrarModal' para que se vea de fondo, 
    // pero el 'appendTo="body"' del HTML hará que el calendario flote encima.
}

// Asegúrate de inicializar la variable al inicio de tu clase


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
      // Opcional: revokeObjectURL después de un tiempo para liberar memoria
    },
    error: (err: any) => {
      console.error('Error al generar la vista previa', err);
      this.toastr.error('No se pudo generar el reporte', 'Error');
    }
  });
}
  // Switch para cambiar de vista
exportarReporteMensual() {
  // 1. Usamos 'loading' (debes declararlo arriba) o 'cargando' si ya existía
  this.loading = true; 

  // 2. Usamos los IDs que vienen de tus selects (vinculados a filters)
  const idServicio = this.filters.servicio_id;
  const idMes = this.filters.mes_id;

  this.turnoService.getResumenMensual(idServicio, idMes).subscribe({
    next: (res) => {
      const doc = new jsPDF();
      const data = res.data;

      doc.setFontSize(18);
      doc.text('Resumen Mensual de Asistencia', 14, 20);
      
      const rows = data.map((item: any) => [
        item.usuario_nombre,
        item.categoria_nombre,
        `${item.dias_trabajados} días`,
        `${item.total_horas} hrs`
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Personal', 'Categoría', 'Días', 'Total Horas']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69] }
      });

      // 3. Corregimos la referencia a mesId
      doc.save(`Reporte_Mensual_Mes_${idMes}.pdf`);
      this.loading = false;
    },
    error: (err) => {
      console.error('Error al descargar reporte', err);
      this.loading = false;
    }
  });
}



exportarPDFMensual() {
  if (!this.filters.servicio_id || !this.filters.mes_id) {
    alert('Seleccione servicio y mes antes de exportar');
    return;
  }

  this.loading = true;

  this.turnoService.getResumenMensual(this.filters.servicio_id, this.filters.mes_id).subscribe({
    next: (response) => {
      // IMPORTANTE: Accedemos a response.data porque tu JSON viene envuelto así
      const listaPersonal = response.data;

      if (!listaPersonal || listaPersonal.length === 0) {
        alert('No hay datos disponibles para este mes/servicio');
        this.loading = false;
        return;
      }

      const doc = new jsPDF();
      
      // Título y Estilo
      doc.setFontSize(16);
      doc.setTextColor(26, 188, 156); // El verde/teal de tu sistema
      doc.text('REPORTE MENSUAL DE ASISTENCIA', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

      // Mapeo de datos para la tabla
      const rows = listaPersonal.map((p: any) => [
        p.usuario_nombre.toUpperCase(),
        p.categoria_nombre,
        `${p.dias_trabajados} días`,
        `${p.total_horas} hrs`
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['PERSONAL', 'CATEGORÍA', 'DÍAS TRAB.', 'TOTAL HORAS']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [26, 188, 156] }, // Color verde-agua
        styles: { fontSize: 9 },
        columnStyles: {
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });

      doc.save(`Reporte_Mensual_${this.filters.mes_id}.pdf`);
      this.loading = false;
    },
    error: (err) => {
      console.error('Error en el reporte:', err);
      alert('Error al conectar con el servidor');
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
 }
