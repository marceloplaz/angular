import { Component, OnInit } from '@angular/core';
import { VacacionService } from '../../services/vacacion';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import { Vacacion } from 'src/app/interfaces/vacacion';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
declare var bootstrap: any;

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
  this.vacacionService.getPendientes().subscribe({
    next: (res: any) => {
      // Acceso correcto al nuevo formato del backend
      this.vacaciones = res.data || []; 
      this.vacacionesFiltradas = [...this.vacaciones];
      this.aplicarFiltros();
    },
    error: (err) => console.error("Error al cargar datos:", err)
  });
}
 

  aplicarFiltros() {
  console.log('Datos en bruto:', this.vacaciones);
    const busqueda = this.filtros.termino.toLowerCase().trim();

  this.vacacionesFiltradas = this.vacaciones.filter(v => {
    // Busca en el objeto anidado que vimos en tu JSON
    const nombrePersona = v.user?.persona?.nombre_completo?.toLowerCase() || '';
    const nombreAlternativo = v.nombre_completo?.toLowerCase() || '';

    const cumpleNombre = nombrePersona.includes(busqueda) || nombreAlternativo.includes(busqueda);
    
    // Filtros de ID (asegúrate de que coincidan con los IDs que vienen de Laravel)
    const cumpleGestion = !this.filtros.gestion || v.gestion_id?.toString() === this.filtros.gestion;
    const cumpleServicio = !this.filtros.servicio || v.servicio_id?.toString() === this.filtros.servicio;

    return cumpleNombre && cumpleGestion && cumpleServicio;
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
  async abrirModalProcesar(vacacion: Vacacion) {
    // Calculamos el derecho sugerido según su ingreso
    const derechoSugerido = this.obtenerDerechoPorAntiguedad(vacacion.fecha_ingreso_institucion);

    const { value: formValues } = await Swal.fire({
      title: 'Procesar Solicitud de Vacación',
      html: `
        <div class="text-start" style="font-size: 0.9rem;">
          <p><strong>Personal:</strong> ${vacacion.nombre_completo}</p>
          <p><strong>Derecho según Antigüedad:</strong> ${derechoSugerido} días</p>
          <hr>
          <label class="form-label fw-bold">Días Solicitados a descontar:</label>
          <input id="swal-dias" type="number" class="form-control mb-3" value="${vacacion.dias_solicitados}">
          
          <label class="form-label fw-bold">Motivo Detalle:</label>
          <textarea id="swal-motivo" class="form-control mb-3" rows="2">${vacacion.motivo_detalle || ''}</textarea>
          
          <label class="form-label fw-bold">Observaciones del Administrador:</label>
          <textarea id="swal-obs" class="form-control" rows="2" placeholder="Nota opcional..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-check-circle"></i> Aprobar y Activar',
      confirmButtonColor: '#166534',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const dias = (document.getElementById('swal-dias') as HTMLInputElement).value;
        if (!dias || Number(dias) <= 0) {
          Swal.showValidationMessage('Debe ingresar un número de días válido');
        }
        return {
          dias: Number(dias),
          motivo: (document.getElementById('swal-motivo') as HTMLTextAreaElement).value,
          obs: (document.getElementById('swal-obs') as HTMLTextAreaElement).value
        };
      }
    });

    if (formValues) {
      this.ejecutarAprobacion(vacacion, formValues);
    }
  }

  private ejecutarAprobacion(v: Vacacion, datos: any) {
    // El 'aprobado_por' se gestionará en el backend con auth()->id(),
    // pero aquí mandamos el estado 1 (Asignado) y los días confirmados.
    
    this.vacacionService.actualizarEstado(v.id!, 1, datos.obs, datos.dias).subscribe({
      next: (res) => {
        Swal.fire({
          title: 'Activado',
          text: `La vacación ha sido aprobada. Nuevo saldo: ${res.data.saldo_restante} días.`,
          icon: 'success',
          confirmButtonColor: '#166534'
        });
        this.cargarVacaciones(); // Recargamos para ver los cambios y el created_at
      },
      error: (err) => {
        Swal.fire('Error', err.error.message || 'No se pudo procesar la solicitud', 'error');
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
    motivo_tipo: 'VACACION_ANUAL'
  };

  // 3. Cargamos el historial del usuario
  this.cargarHistorial(this.nuevoRegistro.user_id);

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
  // 1. Creamos el payload específico para INGRESO
  const payload = {
    ...this.nuevoRegistro,
    gestion_id: this.nuevoRegistro.gestion_id || this.usuarioSeleccionado.gestion_id, 
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

  // Creamos el payload limpiando explícitamente los campos de "Control"
  // Esto evita que se guarde un registro mixto
  const payload = {
    ...this.nuevoRegistro,
    dias_solicitados: this.diasCalculadosKardex, // Valor calculado (el -)
    cas_calificacion: 0,   // Forzamos a 0 para que no sume
    dias_derecho: 0,       // Forzamos a 0 para que no sume
    tipo: 'SALIDA' 
  };

  this.vacacionService.guardarKardex(payload).subscribe({
    next: (res: any) => {
      if(res.res) {
        // Usamos el ID del usuario seleccionado para recargar la tabla correcta
        this.cargarHistorial(this.usuarioSeleccionado.id);
        this.resetFormKardex();
        Swal.fire('Éxito', 'Permiso registrado y saldo descontado correctamente', 'success');
      }
    },
    error: (err) => {
      console.error('Error al registrar salida:', err);
      Swal.fire('Error', 'No se pudo registrar la salida en el servidor', 'error');
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

}