import { Component, OnInit } from '@angular/core';
import { VacacionService } from '../../services/vacacion';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import { Vacacion } from 'src/app/interfaces/vacacion';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { bootstrapApplication } from '@angular/platform-browser';
declare var bootstrap: any;
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vacacion',
  standalone: true, 
  imports: [CommonModule, FormsModule],
  templateUrl: './vacaciones.html',
  styleUrls: ['./vacaciones.scss']
})
export class VacacionComponent implements OnInit {
  vacaciones: any[] = [];
  vacacionesFiltradas: any[] = [];
  listadoGestiones: any[] = [];
  listadoServicios: any[] = [];
  listadoCategorias: any[] = [];
  historialKardex: any[] = [];
  diasExcedidos: boolean = false;
  usuarioSeleccionado: any = null;
  vSeleccionada: any = null;
  diasCalculadosModal: number = 0;
  diasCalculadosKardex: number = 0;
  public historial: any[] = [];  
  estadoFiltro: string = '0';  


  // Filtros flexibles para la interfaz
  filtros = {
    termino: '',    // Para nombre_completo (nombres y apellidos)
    gestion: '',    // ID o año de gestión
    categoria: '',  // ID de categoría
    servicio: ''    // ID de servicio
  };

nuevoRegistro: any = {
  id: null,
  user_id: null,
  gestion_id: null,
  servicio_id: null,
  gestiones_cumplidas: '',
  cas_calificacion: 0,
  dias_derecho: 20,
  descripcion: '',
  fecha_inicio: null,
  fecha_fin: null,
  fecha_solicitud: '', 
    fecha_retorno: '',    
  motivo_tipo: 'VACACION_ANUAL',

}


  constructor(
    private vacacionService: VacacionService,
    private authService: AuthService 
  ) {}

  ngOnInit(): void {
    this.cargarVacaciones();
    this.cargarSelects();
  }


  cargarSelects() {
  // Llama a tus servicios para obtener los datos de la DB
  this.vacacionService.getGestiones().subscribe(res => this.listadoGestiones = res);
  this.vacacionService.getServicios().subscribe(res => this.listadoServicios = res);
  this.vacacionService.getCategorias().subscribe(res => this.listadoCategorias = res);
}
 
cargarVacaciones() {
  this.vacacionService.getVacacionesGenerales().subscribe({
    next: (res: any) => {
      const vacacionesBase = res.data || []; 
      
      if (vacacionesBase.length === 0) {
        this.vacaciones = [];
        this.vacacionesFiltradas = [];
        return;
      }

      // Creamos el array de observables asegurando que devuelvan 'Observable<any>'
      const peticionesKardex: Observable<any>[] = vacacionesBase.map((v: any) => {
        const idUsuario = v.usuario_id || v.user_id;
        if (idUsuario) {
          return this.vacacionService.getHistorialKardex(idUsuario).pipe(
            catchError((err) => {
              console.error(`Error con el Kardex del usuario ${idUsuario}:`, err);
              return of({ res: false, data: [] }); // Mantiene la estructura en caso de error
            })
          );
        }
        return of({ res: false, data: [] });
      });

      // Procesamos de forma masiva con forkJoin
      forkJoin(peticionesKardex).subscribe(
        (respuestasKardex: any[]) => {
          this.vacaciones = vacacionesBase.map((v: any, index: number) => {
            const responseHttp = respuestasKardex[index];
            
            // 🌟 CORRECCIÓN CLAVE: Extraemos el array plano de movimientos (.data)
            const movimientosPuros = responseHttp && responseHttp.data ? responseHttp.data : [];

            return {
              ...v,
              kardex_vacaciones: movimientosPuros
            };
          });

          // Ahora que 'kardex_vacaciones' es un array real, ejecutamos el cálculo
          this.calcularSaldosPorGestion();
          this.vacacionesFiltradas = [...this.vacaciones];
 
        },
        (error) => {
          console.error("Error crítico en forkJoin:", error);
        }
      );
    },
    error: (err) => {
      console.error("Error al cargar datos base de vacaciones:", err);
    }
  });
}
aplicarFiltros() {
  if (!this.vacaciones) return;

  const busqueda = this.filtros.termino?.toLowerCase().trim() || '';

  this.vacacionesFiltradas = this.vacaciones.filter(v => {
    // 1. Filtro por Nombre Completo
    const nombrePersona = v.user?.persona?.nombre_completo?.toLowerCase() || '';
    const nombreAlternativo = v.nombre_completo?.toLowerCase() || '';
    const cumpleNombre = nombrePersona.includes(busqueda) || nombreAlternativo.includes(busqueda);

    // 2. Filtros Selectores (Gestión, Servicio, Categoría)
    const cumpleGestion = !this.filtros.gestion || v.gestion_id?.toString() === this.filtros.gestion;
    const cumpleServicio = !this.filtros.servicio || v.servicio_id?.toString() === this.filtros.servicio;
    const cumpleCategoria = !this.filtros.categoria || v.user?.categoria_id?.toString() === this.filtros.categoria;

    // 3. 🌟 Comparación Blindada de Estados (Evita conflictos entre String y Number)
    let cumpleEstado = false;
    if (this.estadoFiltro === 'TODOS') {
      cumpleEstado = true; // Si es TODOS, no restringe por estado
    } else {
      // Forzamos ambos lados a string para asegurar que '1' === '1' o '0' === '0'
      const estadoRegistro = v.estado !== undefined && v.estado !== null ? v.estado.toString() : '';
      cumpleEstado = estadoRegistro === this.estadoFiltro.toString();
    }

    // Retorna el registro solo si pasa todos los filtros en cadena
    return cumpleNombre && cumpleGestion && cumpleServicio && cumpleCategoria && cumpleEstado;
  });
}

  /**
   * Lógica de Antigüedad según la escala institucional
   * 1-5 años: 15 días | 5-10 años: 20 días | 10+ años: 30 días
   */
  obtenerDerechoPorAntiguedad(fechaIngreso: string): number {
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    let antiguedad = hoy.getFullYear() - ingreso.getFullYear();
    
    // Ajuste por mes/día para precisión
    const m = hoy.getMonth() - ingreso.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) {
        antiguedad--;
    }

    if (antiguedad >= 1 && antiguedad < 5) return 15;
    if (antiguedad >= 5 && antiguedad < 10) return 20;
    if (antiguedad >= 10) return 30;
    return 0;
  }

  /**
   * Abre el modal para procesar la vacación (Aprobar/Rechazar)
   * Se activa al hacer clic en permiso_cuenta o botón de acción
   */
  /**
   * Abre el modal para procesar la vacación (Aprobar/Rechazar)
   * Se activa al hacer clic en permiso_cuenta o botón de acción
   */
  async abrirModalProcesar(vacacion: any) {
    // 🌟 Extracción segura de datos para la interfaz del Hospital
    const nombrePersonal = vacacion.nombre_completo || 
                           vacacion.user?.persona?.nombre_completo || 
                           vacacion.user?.name || 'Personal Hospital';
                           
    const fechaIngreso = vacacion.fecha_ingreso_institucion || 
                         vacacion.user?.persona?.fecha_ingreso_institucion || 
                         vacacion.user?.created_at;

    // Calculamos el derecho sugerido según su ingreso real
    const derechoSugerido = this.obtenerDerechoPorAntiguedad(fechaIngreso);

    // Capturamos el estado actual directo de la base de datos (0, 1, 2)
    const estadoActual = vacacion.estado !== undefined ? Number(vacacion.estado) : 0;

    const { value: formValues } = await Swal.fire({
      title: 'Procesar Solicitud de Vacación',
      html: `
        <div class="text-start" style="font-size: 0.9rem;">
          <p><strong>Personal:</strong> ${nombrePersonal}</p>
          <p><strong>Derecho según Antigüedad:</strong> ${derechoSugerido} días</p>
          <hr>
          
          <label class="form-label fw-bold">Estado de la Solicitud:</label>
          <select id="swal-estado" class="form-select mb-3">
            <option value="0" ${estadoActual === 0 ? 'selected' : ''}>0: Sin asignar</option>
            <option value="1" ${estadoActual === 1 ? 'selected' : ''}>1: Asignado (Aprobar)</option>
            <option value="2" ${estadoActual === 2 ? 'selected' : ''}>2: Rechazado</option>
          </select>

          <label class="form-label fw-bold">Días Solicitados a descontar:</label>
          <input id="swal-dias" type="number" class="form-control mb-3" value="${vacacion.dias_solicitados || 0}">

          <label class="form-label fw-bold">Tipo de Motivo:</label>
          <select id="swal-motivo-tipo" class="form-select mb-3" ${estadoActual === 0 ? 'disabled' : ''}>
            <option value="VACACION_PROGRAMADA" ${vacacion.motivo_tipo === 'VACACION_PROGRAMADA' ? 'selected' : ''}>VACACION PROGRAMADA</option>
            <option value="SALUD" ${vacacion.motivo_tipo === 'SALUD' ? 'selected' : ''}>SALUD</option>
            <option value="TRAMITE" ${vacacion.motivo_tipo === 'TRAMITE' ? 'selected' : ''}>TRAMITE</option>
            <option value="FAMILIAR" ${vacacion.motivo_tipo === 'FAMILIAR' ? 'selected' : ''}>FAMILIAR</option>
            <option value="PARTICULAR" ${vacacion.motivo_tipo === 'PARTICULAR' ? 'selected' : ''}>PARTICULAR</option>
            <option value="OTRO" ${vacacion.motivo_tipo === 'OTRO' ? 'selected' : ''}>OTRO</option>
          </select>
          
          <label class="form-label fw-bold">Observaciones / Detalles:</label>
          <textarea id="swal-obs" class="form-control mb-3" rows="2" 
                    placeholder="Escriba el motivo u observaciones..." 
                    ${estadoActual === 0 ? 'disabled' : ''}>${vacacion.observaciones || vacacion.motivo_detalle || ''}</textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-save"></i> Guardar Cambios',
      confirmButtonColor: '#166534',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const selectEstado = document.getElementById('swal-estado') as HTMLSelectElement;
        const selectMotivo = document.getElementById('swal-motivo-tipo') as HTMLSelectElement;
        const txtObs = document.getElementById('swal-obs') as HTMLTextAreaElement;

        // Escuchador en caliente para bloquear inputs si vuelve a estar "Sin Asignar"
        selectEstado.addEventListener('change', () => {
          const estadoSeleccionado = Number(selectEstado.value);
          if (estadoSeleccionado === 0) {
            selectMotivo.disabled = true;
            txtObs.disabled = true;
          } else {
            selectMotivo.disabled = false;
            txtObs.disabled = false;
            txtObs.focus();
          }
        });
      },
      preConfirm: () => {
        const estado = Number((document.getElementById('swal-estado') as HTMLSelectElement).value);
        const dias = (document.getElementById('swal-dias') as HTMLInputElement).value;
        const motivo_tipo = (document.getElementById('swal-motivo-tipo') as HTMLSelectElement).value;
        const observaciones = (document.getElementById('swal-obs') as HTMLTextAreaElement).value;

        if (estado === 1 && (!dias || Number(dias) < 0)) {
          Swal.showValidationMessage('Debe ingresar un número de días válido para asignar');
          return false;
        }

        if (estado !== 0 && !observaciones.trim()) {
          Swal.showValidationMessage('Debe ingresar un motivo u observaciones para cambiar el estado');
          return false;
        }

        return {
          estado: estado,
          dias: Number(dias),
          motivo_tipo: motivo_tipo,
          obs: observaciones
        };
      }
    });

    if (formValues) {
      this.ejecutarAprobacion(vacacion, formValues);
    }
  }

  private ejecutarAprobacion(v: any, datos: any) {
    this.vacacionService.actualizarEstado(v.id!, datos.estado, datos.obs, datos.dias, datos.motivo_tipo).subscribe({
      next: (res: any) => {
        Swal.fire({
          title: '¡Actualizado!',
          text: 'La solicitud y el estado de la vacación se sincronizaron con éxito.',
          icon: 'success',
          confirmButtonColor: '#166534'
        });
        this.cargarVacaciones(); // Forzar recarga completa de la grilla
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'No se pudo procesar la solicitud', 'error');
      }
    });
  }


  
  // Método para rechazar rápidamente si fuera necesario
  rechazarSolicitud(id: number) {
    Swal.fire({
      title: '¿Rechazar solicitud?',
      input: 'textarea',
      inputLabel: 'Indique el motivo del rechazo',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Rechazar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.vacacionService.actualizarEstado(id, 2, result.value).subscribe(() => {
          this.cargarVacaciones();
        });
      }
    });
  }

  actualizarProgramacion(vacacion: any) {
  if (!vacacion.fecha_inicio || !vacacion.fecha_fin) return;

  const datos = {
    fecha_inicio: vacacion.fecha_inicio,
    fecha_fin: vacacion.fecha_fin
  };

  this.vacacionService.programarFechas(vacacion.id, datos).subscribe({
    next: (res: any) => {
      // Opcional: Mostrar una alerta de éxito
      console.log(res.mensaje);
      this.cargarVacaciones(); // Recargamos para ver saldos actualizados
    },
    error: (err) => console.error("Error al programar:", err)
  });
}

abrirModalKardex(v: any) {
  // 1. Asignamos el usuario para la cabecera
  this.usuarioSeleccionado = v.user;

  // 2. Preparamos el objeto con los datos que YA vienen en la fila 'v'
  this.nuevoRegistro = {
    user_id: v.usuario_id || v.user_id,
    gestion_id: v.gestion_id,
    servicio_id: v.servicio_id,
    // AQUÍ ESTÁ LO QUE FALTABA: Precargamos los valores de la fila
    cas_calificacion: v.cas_calificacion || 0, 
    dias_derecho: v.total_dias_derecho || v.dias_derecho || 0,
    gestiones_cumplidas: v.gestiones_cumplidas || '',
    descripcion: '', // Se deja vacío para que el usuario escriba si desea
    
    // Inicializamos fechas por si acaso se usará el formulario de salida
    fecha_inicio: null,
    fecha_fin: null,
    motivo_tipo: 'PERMISO CUENTA VACACION'
  };

  if (this.nuevoRegistro.user_id) {
    this.cargarHistorial(this.nuevoRegistro.user_id);
  }
  

  // 4. Reiniciamos los cálculos de días del modal para que no arrastre datos previos
  this.diasCalculadosKardex = 0;
  this.diasExcedidos = false;

  // 5. Disparamos el modal
  const modalElement = document.getElementById('modalKardex');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
}

cargarHistorial(userId: number) {
  this.vacacionService.getHistorialKardex(userId).subscribe({
    next: (res) => {
      if (res.res) {
        // 1. Asignamos los datos
        this.historialKardex = res.data;

        // 2. IMPORTANTE: Si tu backend no envía los datos ordenados, 
        // ordénalos aquí por ID o Fecha de forma descendente.
        this.historialKardex.sort((a, b) => b.id - a.id);

        // 3. Opcional: Actualizar el saldo en el objeto del usuario actual
        if (this.historialKardex.length > 0) {
          this.usuarioSeleccionado.saldo_actual = this.historialKardex[0].saldo_restante;
        }
      }
    },
    error: (err) => {
      console.error('Error al obtener el historial del Hospital:', err);
    }
  });
}


// 3. Guardar el registro (Suma automática ocurre en el controlador)
enviarKardex() {
  
  
  const hoy = new Date();
  const tzOffset = hoy.getTimezoneOffset() * 60000;
  const fechaActual = new Date(hoy.getTime() - tzOffset).toISOString().split('T')[0];
  // 1. Creamos el payload específico para INGRESO
  const payload = {
    ...this.nuevoRegistro,
    gestion_id: this.nuevoRegistro.gestion_id || this.usuarioSeleccionado.gestion_id, 
    fecha_solicitud: this.nuevoRegistro.fecha_solicitud || fechaActual,
    fecha_inicio: null,
    fecha_fin: null,
    dias_solicitados: 0,
    tipo: 'INGRESO' 
  };

  // 2. Llamamos al servicio pasando el payload
  this.vacacionService.guardarKardex(payload).subscribe({
    next: (res: any) => {
      if(res.res) {
        this.cargarHistorial(this.usuarioSeleccionado.id);
        this.resetFormKardex();
        Swal.fire('Guardado', 'La tarjeta de control ha sido actualizada', 'success');
      }
    },
    error: (err) => {
      console.error('Error al guardar gestión:', err);
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
  });
}

// 4. Cargar datos para editar
cargarParaEditar(item: any) {
  this.nuevoRegistro = { ...item }; // Copiamos los datos al formulario
}



resetFormKardex() {
  // 1. Capturamos los IDs importantes antes de limpiar el objeto
  const userId = this.usuarioSeleccionado?.id;
  const gestionId = this.nuevoRegistro?.gestion_id;
  const servicioId = this.nuevoRegistro?.servicio_id;

  // 2. Limpiamos el objeto por completo
  this.nuevoRegistro = { 
    id: null, 
    user_id: userId, 
    gestion_id: gestionId, 
    servicio_id: servicioId,
    gestiones_cumplidas: '', 
    cas_calificacion: 0, 
    dias_derecho: 20, 
    descripcion: '',
    fecha_solicitud: '', 
    fecha_retorno: '',   
    // Campos para la Salida/Permiso
    fecha_inicio: null,
    fecha_fin: null,
    motivo_tipo: 'VACACION_ANUAL',
    dias_solicitados: 0
  };

  // 3. Reseteamos los estados visuales del Hospital
  this.diasCalculadosKardex = 0;
  this.diasExcedidos = false;
}


eliminarRegistro(id: number) {
  if (confirm('¿Está seguro de eliminar este registro del historial?')) {
    this.vacacionService.eliminarRegistroKardex(id).subscribe({
      next: (res: any) => {
        if (res.res) {
          // Recargamos el historial del usuario actual
          this.cargarHistorial(this.usuarioSeleccionado.id);
          alert('Registro eliminado con éxito.');
        }
      },
      error: (err) => console.error('Error al eliminar:', err)
    });
  }
}

prepararPermiso(v: any) {
  this.vSeleccionada = { ...v }; // Clonamos para no afectar la tabla antes de guardar
}


calcularDiasKardex() {
  if (this.nuevoRegistro.fecha_inicio && this.nuevoRegistro.fecha_fin) {
    const inicio = new Date(this.nuevoRegistro.fecha_inicio + 'T00:00:00');
    const fin = new Date(this.nuevoRegistro.fecha_fin + 'T00:00:00');
    
    if (fin < inicio) {
      this.diasCalculadosKardex = 0;
      this.diasExcedidos = false;
      return;
    }

    const diff = fin.getTime() - inicio.getTime();
    this.diasCalculadosKardex = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
    
    // --- CAMBIO CLAVE AQUÍ ---
    // En lugar de confiar en un campo de la BD que puede estar en 0,
    // usamos tu función que suma y resta todo el historial.
    // El índice 0 es el saldo más reciente (el de arriba de la tabla).
    const saldoDisponibleReal = this.calcularSaldoAcumulado(0);
    
    // Validamos: si pide más de lo que acumuló, excedido es true.
    this.diasExcedidos = (this.diasCalculadosKardex > saldoDisponibleReal);
    // -------------------------

  } else {
    this.diasCalculadosKardex = 0;
    this.diasExcedidos = false;
  }
}

guardarSalidaKardex() {
  if (this.diasExcedidos) {
    Swal.fire('Error', 'Los días superan el saldo disponible', 'error');
    return;
  }

  const payload = {
    ...this.nuevoRegistro,
    dias_solicitados: this.diasCalculadosKardex,
    fecha_retorno: this.nuevoRegistro.fecha_retorno,
    fecha_solicitud: this.nuevoRegistro.fecha_solicitud,
    
    cas_calificacion: 0,
    dias_derecho: 0,
    tipo: 'SALIDA' 
  };

  this.vacacionService.guardarKardex(payload).subscribe({
    next: (res: any) => {
      if(res.res) {
        // 1. Recarga el historial del modal (Kardex)
        this.cargarHistorial(this.usuarioSeleccionado.id);
        
        // 2. IMPORTANTE: Recarga la tabla principal de vacaciones
        // Llama aquí a la función que carga tu lista principal (la de atrás)
     this.aplicarFiltros();

        this.resetFormKardex();
        Swal.fire('Éxito', 'Permiso registrado, saldo descontado y fechas sincronizadas', 'success');
      }
    },
    error: (err) => {
      console.error('Error al registrar salida:', err);
      // Muestra el error que viene del backend (ej. "Saldo insuficiente")
      const mensajeError = err.error?.mensaje || 'No se pudo registrar la salida';
      Swal.fire('Error', mensajeError, 'error');
    }
  });
}



calcularSaldoAcumulado(index: number): number {
    let saldoTotal = 0;
    
    // 1. Validar que el array tenga datos
    if (!this.historialKardex || this.historialKardex.length === 0) return 0;

    // 2. IMPORTANTE: Como la tabla muestra lo más nuevo arriba (descendente),
    // para calcular el saldo de una fila "X", debemos sumar TODO lo que
    // ocurrió desde el principio de la historia hasta esa fila.
    // Recorremos desde el final del array (lo más antiguo) hasta el index actual.
    
    for (let i = this.historialKardex.length - 1; i >= index; i--) {
        const item = this.historialKardex[i];
        
        if (item.tipo === 'INGRESO') {
            // Sumamos días ganados
            saldoTotal += (Number(item.cas_calificacion || 0) + Number(item.dias_derecho || 0));
        } else if (item.tipo === 'SALIDA') {
            // Restamos días consumidos
            saldoTotal -= Number(item.dias_solicitados || 0);
        }
    }
    
    return saldoTotal;
}
calcularSaldosPorGestion() {
  if (!this.vacaciones || this.vacaciones.length === 0) return;

  this.vacaciones = this.vacaciones.map((v: any) => {
    const movimientos = v.kardex_vacaciones || [];

    let totalDerecho = 0;
    let totalConsumido = 0;

    // Procesamiento simple sin depender de orden de IDs o fechas
    movimientos.forEach((mov: any) => {
      if (mov.tipo === 'INGRESO') {
        const cas = Number(mov.cas_calificacion) || 0;
        const derecho = Number(mov.dias_derecho) || 0;
        totalDerecho += (cas + derecho);
      } else if (mov.tipo === 'SALIDA') {
        totalConsumido += (Number(mov.dias_solicitados) || 0);
      }
    });

    const saldoCalculado = totalDerecho - totalConsumido;

    return {
      ...v,
      total_dias_derecho: totalDerecho,
      dias_consumidos: totalConsumido,
      saldo_restante: saldoCalculado >= 0 ? saldoCalculado : 0
    };
  });
}
}