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
  private nombreOriginal = signal<string>('');
  private authService = inject(AuthService);
  public usuario = signal('jugadordeunbit'); 
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
 * Método que dispara la acción desde el HTML (Línea 29)
 */
generarPDFMensualGeneral(): void {
  // 1. Solicitamos los datos actuales al componente de turnos
  this._reporteMensualService.solicitarReporteActual();

  // 2. Capturamos la respuesta "instantánea" de lo que se visualiza
  this._reporteMensualService.enviarDatos$.pipe(take(1)).subscribe(reporte => {
    console.log('Datos recibidos para el PDF:', reporte);
    this.crearDocumentoPDF(reporte);
  });
}

private crearDocumentoPDF(reporte: any): void {
  // Lógica para generar el PDF con jsPDF
  // reporte.filtros y reporte.tabla contienen la info actual
}


private obtenerIdDesdeToken(): number | null {
  const token = this.authService.getToken();
  if (!token) return null;

  try {
    // Decodificamos la base64 del payload (segunda parte del JWT)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // En Laravel Sanctum/Passport, el ID suele venir en 'sub' o 'prv'
    // Puedes hacer un console.log(payload) la primera vez para estar seguro
    return payload.sub ? Number(payload.sub) : null;
  } catch (e) {
    console.error("Error crítico: No se pudo decodificar la identidad del token", e);
    return null;
  }
}
  
  public esInicio = computed(() => {
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
 if (this.nombreOriginal() === '') {
    this.nombreOriginal.set(this.usuario());
  }
  

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

buscarUsuario(event: any) {
  const nombre = event.target.value;
  if (nombre.length > 3) {
    this.servicioService.buscarProfesionales(nombre).subscribe(res => {
      this.listaPersonas.set(res); // Para mostrar sugerencias si deseas
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
  
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS['TEXTO_SUAVE']);
  doc.text(`PROFESIONAL: ${user}`, 20, 40);
  doc.text(`SERVICIO: ${servicioActivo}`, 20, 45);
  doc.text(`FECHA EMISIÓN: ${this.fechaActual()}`, 190, 42, { align: 'right' });

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