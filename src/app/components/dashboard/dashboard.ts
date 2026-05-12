import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
// IMPORTANTE: Verifica que esta ruta sea la del archivo que tiene las signals
import { ServicioService } from '../../services/servicios'; 
import { AuthService } from 'src/app/services/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS } from '../../constants/pdf-colors';
import { ReporteMensualService } from '../../services/reporte-mensual';
import { VacacionService } from '../../services/vacacion';





@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit { // <--- Agregado OnInit aquí
  private router = inject(Router);
  private servicioService = inject(ServicioService);
  private vacacionService = inject(VacacionService);
  private nombreOriginal = signal<string>('');
  private authService = inject(AuthService);

  public saldoRestante: number = 0;
  public diasConsumidos: number = 0;
  public totalDerecho: number = 15; // Valor base por defecto
  public porcentajeUso: number = 0;

  public usuario = signal(''); 
  public sidebarVisible = signal(true);
  public listaPersonas = signal<any[]>([]); 
  public misServicios = signal<any[]>([]);
  public fechaActual = signal(new Date().toLocaleDateString('es-ES'));
  public turnosDelMes = signal<any[]>([]);
  public usuarioBuscadoId = signal<number | null>(null);
  public mesVisualizado = signal<number>(new Date().getMonth() + 1); // 5 para Mayo
  public anioVisualizado = signal<number>(new Date().getFullYear()); // 2026
  private urlSignal = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  





  // UNIFICA AQUÍ TODOS TUS CONSTRUCTORES
constructor(
  private _reporteMensualService: ReporteMensualService,
  
) {
  // Lógica del efecto que estaba en la línea 106/316
  effect(() => {
    const servicio = this.servicioService.servicioSeleccionado();
    if (servicio) {
      this.cargarTurnos(servicio.id);
    }
  }, { allowSignalWrites: true });
}

/**
 * Método que dispara la acción desde el HTML 
 * */
generarPDFMensualGeneral(): void {
  console.log('Iniciando proceso de reporte para Marcelo...');
  
  // 1. Solo enviamos la señal. 
  // El Service y el TurnosComponent ya saben qué hacer entre ellos.
  this._reporteMensualService.solicitarReporteActual();

  // Opcional: Una alerta simple para saber que el proceso inició
  // this.toastr.info('Generando documento...', 'Reporte');
}


private obtenerIdDesdeToken(): number | null {
  const token = this.authService.getToken();
  
  // 1. Verificación de existencia y formato (un JWT debe tener 2 puntos / 3 partes)
  if (!token || token.split('.').length !== 3) {
    return null;
  }

  try {
    // 2. Extraer el payload (la parte media)
    const base64Url = token.split('.')[1];

    // 3. CORRECCIÓN CRÍTICA: atob() falla con caracteres Base64URL (usados en JWT)
    // Reemplazamos '-' por '+' y '_' por '/' para que sea Base64 estándar
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // 4. Decodificación segura (maneja caracteres latinos/especiales si los hay)
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    
    // 5. Retornar el ID (Laravel usa 'sub' para el ID del usuario)
    return payload.sub ? Number(payload.sub) : null;

  } catch (e) {
    // Si el error persiste aquí, el token está corrupto o mal formado
    console.error("Error decodificando el token:", e);
    return null;
  }
}

public esInicio = computed(() => {
  // Asegúrate de que urlSignal() se actualice con los eventos del Router
  const url = this.urlSignal();
  return url === '/dashboard' || url === '/dashboard/';
});







  // Esto fallaba porque el import traía una versión vieja del servicio
  public servicioActivo = this.servicioService.servicioSeleccionado;

  public diasDelMes = computed(() => {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth();
    const primerDia = new Date(año, mes, 1).getDay();
    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const desplazamiento = primerDia === 0 ? 6 : primerDia - 1;
    
    const celdas = [];
    for (let i = 0; i < desplazamiento; i++) { celdas.push(null); }
    for (let d = 1; d <= diasEnMes; d++) { celdas.push(d); }
    return celdas;
  });



tieneTurno(dia: number | null): any {
  if (!dia) return undefined;

  const mesStr = this.mesVisualizado().toString().padStart(2, '0');
  const anioStr = this.anioVisualizado().toString();
  const diaStr = dia.toString().padStart(2, '0');

  const fechaABuscar = `${anioStr}-${mesStr}-${diaStr}`;
  return this.turnosDelMes().find(t => t.fecha === fechaABuscar);
}



extraerHora(horarioCompleto: string): string {
    if (!horarioCompleto) return '';
    
    // Divide el string por los espacios y guiones para obtener solo las horas
    // Transforma "2026-05-04 19:00:00 - 2026-05-04 07:00:00" en "19:00 - 07:00"
    const partes = horarioCompleto.split(' ');
    if (partes.length >= 5) {
        const horaInicio = partes[1].substring(0, 5);
        const horaFin = partes[4].substring(0, 5);
        return `${horaInicio} - ${horaFin}`;
    }
    return horarioCompleto;
}


cargarTurnos(servicioId: number) {
  // Prioridad 1: Usuario que estás auditando (ej. Tapia Lidovina)
  // Prioridad 2: Tu propio ID extraído de forma segura del Token
  const idParaConsulta = this.usuarioBuscadoId() ?? this.obtenerIdDesdeToken();
  
  if (!idParaConsulta) {
    console.warn('No se detectó una sesión activa o usuario para consultar');
    return;
  }

  // Usamos tus signals de fecha para que sea dinámico
  const mes = this.mesVisualizado(); 
  const anio = this.anioVisualizado();

  this.servicioService.getTurnosPorServicio(idParaConsulta, servicioId, mes, anio).subscribe({
    next: (res: any) => {
      this.turnosDelMes.set(res.data || []); 
    },
    error: (err) => console.error('Error en la comunicación con el backend:', err)
  });
}
ngOnInit() {
 const nombreSesion = localStorage.getItem('usuario_nombre');
 if (nombreSesion) {
    this.usuario.set(nombreSesion); // VISUALIZA EL NOMBRE DEL USUARIO LOGUEADA
  }
  if (this.nombreOriginal() === '') {
    this.nombreOriginal.set(this.usuario());
  }
  
  //para vacaciones
  this.cargarResumenVacaciones();


  // 2. Cargamos los servicios (usamos el método que ya tienes definido)
  this.servicioService.getServiciosInicio().subscribe({
    next: (response) => {
      const serviciosAsignados = response.data || [];
      this.misServicios.set(serviciosAsignados); 

      // 3. Seleccionamos el primero para activar el calendario
      if (serviciosAsignados.length > 0 && !this.servicioActivo()) {
        this.servicioService.seleccionarServicio(serviciosAsignados[0]);
      }
    },
    error: (err: any) => console.error('Error al cargar servicios asignados:', err)
  });
}

// para cargar las vacaciones que se necesita

cargarResumenVacaciones() {
  // Obtenemos el ID del usuario desde el localStorage o tu AuthService
  const userId = Number(localStorage.getItem('usuario_id')); 

  if (userId) {
    this.vacacionService.getHistorialByUsuario(userId).subscribe({
      next: (res) => {
        // Buscamos la última vacación con estado 1 (Aprobado)
        // Usamos el historial que viene de tu API de Laravel
        const ultimaAprobada = res.historial.find((v: any) => v.estado === 1);
        
        if (ultimaAprobada) {
          this.saldoRestante = ultimaAprobada.saldo_restante;
          this.totalDerecho = ultimaAprobada.total_dias_derecho;
        } else {
          // Si no hay aprobadas, asumimos los días por defecto (ej. 15)
          this.saldoRestante = 15;
          this.totalDerecho = 15;
        }
        
        // Calculamos los días consumidos para la barra de progreso
        this.diasConsumidos = this.totalDerecho - this.saldoRestante;
      },
      error: (err) => console.error('Error al cargar saldo de vacaciones', err)
    });
  }
}

//ruta para para solicitar la vacacion
irAFormulario(tipo: string) {
  // Navega al mismo componente pero enviando el tipo como parámetro
  this.router.navigate(['/administracion/vacaciones/nuevo'], { 
    queryParams: { tipo: tipo } 
  });
}


seleccionar(servicio: any) {
  // Actualizamos el signal central. 
  // El "effect" en el constructor reaccionará y llamará a cargarTurnos automáticamente.
  this.servicioService.seleccionarServicio(servicio);
}
 

  cargarMisServicios() {
  // CAMBIO: Usamos el método que apunta a /servicios/inicio
  this.servicioService.getServiciosInicio().subscribe({
    next: (response) => {
      // El backend ya envía solo los servicios asignados en 'data'
      const serviciosAsignados = response.data || [];

      // Actualizamos la señal con la lista filtrada (ya no serán 47)
      this.misServicios.set(serviciosAsignados); 

      // Si hay servicios y no hay uno activo, seleccionamos el primero
      if (serviciosAsignados.length > 0 && !this.servicioActivo()) {
        this.servicioService.seleccionarServicio(serviciosAsignados[0]);
      }
    },
    error: (err) => {
      console.error('Error al cargar servicios asignados:', err);
    }
  });
}

buscarUsuario(valor: string) {
  // Ahora 'valor' es directamente el texto del input
  if (!valor || valor.trim() === '') {
    this.restablecerVistaPropia();
    return;
  }

  if (valor.length >= 3) {
    this.servicioService.buscarProfesionales(valor).subscribe({
      next: (res: any) => {
        this.listaPersonas.set(res);
      },
      error: (err: any) => console.error('Error al buscar:', err)
    });
  }
}

seleccionarUsuario(usuario: any) {
  // 1. Guardamos el ID del usuario (el 245 del JSON)
  this.usuarioBuscadoId.set(usuario.id);
  
  // 2. Seteamos el nombre desde la relación 'persona'
  const nombreCompleto = usuario.persona?.nombre_completo || usuario.name;
  this.usuario.set(nombreCompleto);

  // 3. Limpiamos la lista de sugerencias
  this.listaPersonas.set([]);

  // 4. Cargamos sus servicios
  this.servicioService.getServiciosPorUsuario(usuario.id).subscribe(res => {
    // Ajustado según lo que devuelve tu API (data o array directo)
    const servicios = res.data || res.servicios || res;
    this.misServicios.set(servicios);
    
    if (servicios.length > 0) {
      // Esto disparará automáticamente el EFFECT del constructor
      this.servicioService.seleccionarServicio(servicios[0]);
    } else {
      // Si no tiene servicios, vaciamos los turnos previos
      this.turnosDelMes.set([]);
    }
  });
}

restablecerVistaPropia() {
  // 1. Limpieza total de estado para evitar datos "colgados" visualmente
  this.turnosDelMes.set([]);        // Vacía el calendario
  this.misServicios.set([]);        // Vacía la lista lateral (usando el nombre correcto)
  
  // 2. Restablecer IDs y nombres al estado original (Marcelo Plaza)
  this.usuarioBuscadoId.set(null);
  this.usuario.set(this.nombreOriginal()); 
  
  // 3. Llamamos al método que ya tienes definido para cargar TUS servicios
  this.cargarMisServicios(); 
}
  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  generarPDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const user = this.usuario().toUpperCase();
  const servicioActivo = this.servicioActivo()?.nombre || 'Sin Servicio';

  // --- CABECERA (Verde Hospital #27ae60) ---
  doc.setFillColor(...PDF_COLORS['VERDE_HOSPITAL']);
  doc.rect(0, 0, 210, 20, 'F');
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS['BLANCO']);
  doc.text('HOSPITAL SAN JUAN DE DIOS', 15, 13);
  
  // --- TÍTULO Y CARD DE INFO (Estilo Dashboard) ---
  doc.setTextColor(...PDF_COLORS['VERDE_OSCURO']);
  doc.setFontSize(10);
  doc.text('REPORTE MENSUAL DE GUARDIAS', 15, 28);

  doc.setFillColor(...PDF_COLORS['FONDO_MENTA']);
  doc.setDrawColor(225, 233, 229); // #e1e9e5 de tu SCSS
  doc.roundedRect(15, 33, 180, 18, 2, 2, 'FD');
  // Configuración de estilo para metadatos
doc.setFontSize(9); // Un punto más grande ayuda a la lectura en impresión
doc.setTextColor(...PDF_COLORS['TEXTO_SUAVE']);

// Columna Izquierda: Datos del Profesional y Servicio
doc.text(`PROFESIONAL: ${this.nombreOriginal()}`, 14, 42); // Usamos el signal persistente
doc.text(`SERVICIO: ${servicioActivo}`, 14, 47);

// Columna Derecha: Datos de Emisión
doc.text(`FECHA EMISIÓN: ${this.fechaActual()}`, 280, 42, { align: 'right' });
doc.text(`GESTIÓN: 2026`, 280, 47, { align: 'right' }); // Referencia de año actual

  // --- TABLA DE TURNOS ---


autoTable(doc, {
  startY: 55,
  head: [['FECHA', 'ÁREA / UNIDAD', 'TURNO', 'HORARIO']],
  // Ordenamos para que el reporte sea legible cronológicamente
  body: [...this.turnosDelMes()]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(t => [
      t.fecha, 
      t.area_nombre || 'General / No especificado', // <--- Esta es la clave exacta que viene de tu backend
      t.nombre_turno, 
      this.extraerHora(t.horario)
    ]),
  theme: 'grid',
  headStyles: { 
    fillColor: PDF_COLORS['VERDE_HOSPITAL'], 
    halign: 'center',
    fontSize: 9 
  },
  styles: { 
    fontSize: 8, 
    cellPadding: 3, 
    lineColor: [225, 233, 229] 
  },
  alternateRowStyles: { fillColor: PDF_COLORS['FONDO_MENTA'] },
  columnStyles: { 
    0: { halign: 'center', fontStyle: 'bold' }, 
    2: { halign: 'center' }, 
    3: { halign: 'center' } 
  }
});
  // Guardar con nombre dinámico
  doc.save(`Rol_Guardias_${user.replace(/\s+/g, '_')}.pdf`);
}



}