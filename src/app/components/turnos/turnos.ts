import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';
import { NovedadComponent } from '../novedad/novedad';
import { DragDropModule, CdkDragDrop,  CdkDropListGroup,  CdkDropList,  CdkDrag,   } from '@angular/cdk/drag-drop';
import { CdkDragPlaceholder } from '@angular/cdk/drag-drop'; //relativo para pdf

import { jsPDF } from 'jspdf';// imagen de pdf
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DragDropModule, 
    CdkDropListGroup, 
    CdkDropList, 
    CdkDrag, 
    CdkDragPlaceholder,
    CdkDragPlaceholder, 
    NovedadComponent    
    
  ],
  templateUrl: './turnos.html',
  styleUrl: './turnos.scss',
})

export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private cdRef = inject(ChangeDetectorRef);
  alias: string = 'Usuario Administrativo';

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
  
  if (nombreGuardado) {
    this.alias = nombreGuardado; // Ahora this.alias tendrá el nombre real
  }

    this.cargarCategorias();
    this.cargarTiposDeTurnos();
    this.cargarConfiguracionInicial();
  }

  // --- CARGA DE DATOS ---



  // En turnos.ts

  abrirRegistroNovedad(turno: any) {
  console.log('Intentando abrir novedad para:', turno);
  
  if (!turno) {
    alert('Por favor, selecciona primero un turno de la tabla.');
    return;
  }

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
  this.turnoService.getTurnos({}).subscribe({ 
    next: (res: any) => {
      // Laravel suele envolver los datos en una propiedad 'data'
      this.listaTurnos = res.data || res;
      
      // Si este log muestra los 24 registros, el modal ya no estará vacío
      console.log("Turnos cargados correctamente:", this.listaTurnos);
      
      this.cdRef.detectChanges();
    },
    error: (err) => {
      console.error("Error al cargar turnos. Verifica que la ruta en api.php sea correcta", err);
    }
  });
}

  cargarConfiguracionInicial() {
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios = res.data;
      if (this.servicios.length > 0) this.filters.servicio_id = this.servicios[0].id;
      
      this.turnoService.getConfiguracionCalendario().subscribe((resCal: any) => {
        const data = resCal.data || resCal;
        const gestionActual = data.gestiones?.find((g: any) => g.año == this.filters.gestion);
        if (gestionActual) {
          this.mesesDisponibles = gestionActual.meses;
          const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
          if (mesActual) {
            this.filters.mes_id = mesActual.id;
            this.semanasDisponibles = mesActual.semanas;
            this.filters.semana_id = this.semanasDisponibles[0]?.id;
          }
        }
        this.cargarTurnos();
      });
    });
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

  // --- ASIGNACIÓN MANUAL ---

 guardarAsignacion() {
  if (!this.turnoIdSeleccionado) return;

  const payload = {
    usuario_id: this.personalSeleccionado.usuario_id,
    servicio_id: this.filters.servicio_id,
    turno_id: this.turnoIdSeleccionado,
    semana_id: this.filters.semana_id,
    mes_id: this.filters.mes_id,
    gestion_id: 1, 
    fecha: this.obtenerFechaReal(this.diaSeleccionado),
    estado: 'programado'
  };

  this.turnoService.asignarTurno(payload).subscribe({
    next: () => {
      this.cerrarModal(); // Esto pone mostrarModal en false
      this.cargarTurnos(); // Esto refresca la cuadrícula
    },
    error: (err: any) => console.error("Error al guardar:", err)
  });
}

 onReplicarMes() {
  if (confirm(`¿Estás seguro de replicar esta semana a todo el mes?`)) {
    this.cargando = true;
    this.turnoService.replicarSemanaEnMes(
      this.filters.servicio_id, 
      this.filters.mes_id, 
      this.filters.semana_id
    ).subscribe({
      next: () => {
        alert("La semana se ha replicado en todo el mes exitosamente.");
        this.cargarTurnos();
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        alert("Error al replicar: " + (err.error?.message || 'Intente nuevamente'));
      }
    });
  }
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

  // 2. PREPARACIÓN DE DATOS PARA LA TABLA
  const bodyData = this.personalAgrupado.map(p => {
    const fila = [p.usuario_nombre.toUpperCase()];
    
    this.diasSemana.forEach(dia => {
      const turno = this.obtenerTurnoAsignado(p, dia);
      // Formato multilínea: Nombre del turno y debajo el horario
      fila.push(turno ? `${turno.nombre_turno}\n${turno.horario}` : '');
    });

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
  doc.text(`Generado por: ${this.alias }`, 15, finalY + 5);
  doc.text('Jefe de Servicio / Administrador', 15, finalY + 10);

  // Fecha y hora de impresión (esquina inferior derecha)
  doc.setFontSize(8);
  doc.setTextColor(150);
  const fechaGeneracion = `Impreso el: ${new Date().toLocaleString()}`;
  doc.text(fechaGeneracion, pageWidth - 15, finalY + 15, { align: 'right' });

  // 5. DESCARGA DEL ARCHIVO
  doc.save(`Reporte_Turnos_${nombreServicio.replace(/\s+/g, '_')}.pdf`);
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

  // --- MÉTODOS AUXILIARES ---

  obtenerTurnoAsignado(usuario: any, nombreDiaColumna: string) {
    if (!usuario.turnos) return null;
    const fechaBuscada = this.obtenerFechaReal(nombreDiaColumna);
    return usuario.turnos.find((t: any) => t.fecha === fechaBuscada);
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

//capturamos el click para update
abrirOpcionesTurno(turno: any, personal: any) {
  this.turnoSeleccionado = { 
    ...turno, 
    // Guardamos el nombre para que el modal diga "Editando a: Lic. Pérez"
    usuario_nombre: personal.usuario_nombre || personal.nombre, 
    // Aseguramos que el ID del tipo de turno esté listo para el <select>
    turno_id: turno.turno_id || turno.id_turno 
  };
  
  this.mostrarModalCRUD = true;
}

// 2. Método para Actualizar
confirmarActualizacion() {
  const id = this.turnoSeleccionado.id_asignacion; // El ID de la tabla turnos_asignados
  const data = {
    turno_id: this.turnoSeleccionado.turno_id,
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



  calcularTotalHoras(usuario: any): number {
    if (!usuario?.turnos) return 0;
    return usuario.turnos.reduce((acc: number, t: any) => {
      if (t.horario?.includes(' - ')) {
        const [inicio, fin] = t.horario.split(' - ');
        let diff = parseInt(fin) - parseInt(inicio);
        if (diff <= 0) diff += 24;
        return acc + diff;
      }
      return acc;
    }, 0);
  }

  onFilterChange() { this.cargarTurnos(); }

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
    this.personalSeleccionado = { ...personal };
    this.diaSeleccionado = dia;
    this.turnoIdSeleccionado = null;
  
if (this.listaTurnos.length === 0) {
      this.cargarTiposDeTurnos();
    }

    this.mostrarModal = true;
  }


  cerrarModal() { this.mostrarModal = false; }

 
}