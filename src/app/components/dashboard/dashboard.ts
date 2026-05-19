import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
// 🌟 Importación esencial para controlar el Formato "6"
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

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
  // 🌟 Se añade ReactiveFormsModule aquí para que reconozca [formGroup]
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit { 
  private router = inject(Router);
  private servicioService = inject(ServicioService);
  private vacacionService = inject(VacacionService);
  private nombreOriginal = signal<string>('');
  private authService = inject(AuthService);
  private fb = inject(FormBuilder); // 🌟 Inyección del constructor de formularios

  // 🌟 Variable del Formulario Reactivo para el Formato 6
  public permisoCuentaForm!: FormGroup;
  public alertaPermisoActivo = signal<{ activo: boolean, detalle: string | null }>({ activo: false, detalle: null });
  public saldoRestante: number = 0;
  public diasConsumidos: number = 0;
  public totalDerecho: number = 15; 
  public porcentajeUso: number = 0;

  
  public usuario = signal(''); 
  public sidebarVisible = signal(true);
  public listaPersonas = signal<any[]>([]); 
  public misServicios = signal<any[]>([]);
  public fechaActual = signal(new Date().toLocaleDateString('es-ES'));
  public turnosDelMes = signal<any[]>([]);
  public usuarioBuscadoId = signal<number | null>(null);
  public mesVisualizado = signal<number>(new Date().getMonth() + 1); 
  public anioVisualizado = signal<number>(new Date().getFullYear()); 
  
  private urlSignal = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  constructor(private _reporteMensualService: ReporteMensualService) {
    effect(() => {
      const servicio = this.servicioService.servicioSeleccionado();
      if (servicio) {
        this.cargarTurnos(servicio.id);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    const nombreSesion = localStorage.getItem('usuario_nombre');
    if (nombreSesion) {
      this.usuario.set(nombreSesion); 
    }
    if (this.nombreOriginal() === '') {
      this.nombreOriginal.set(this.usuario());
    }
    
    // Inicializaciones base
    this.cargarResumenVacaciones();
    this.initPermisoForm(); // 🌟 Inicializa el Formulario Dinámico

    this.servicioService.getServiciosInicio().subscribe({
      next: (response) => {
        const serviciosAsignados = response.data || [];
        this.misServicios.set(serviciosAsignados); 

        if (serviciosAsignados.length > 0 && !this.servicioActivo()) {
          this.servicioService.seleccionarServicio(serviciosAsignados[0]);
        }
      },
      error: (err: any) => console.error('Error al cargar servicios asignados:', err)
    });
  }

  restablecerVistaPropia() {
  this.turnosDelMes.set([]); 
  this.misServicios.set([]); 
  this.usuarioBuscadoId.set(null);
  this.usuario.set(this.nombreOriginal()); 
  this.cargarMisServicios(); 
  
  // 🌟 Reseteamos la alerta y el formulario al volver a la vista propia
  this.alertaPermisoActivo.set({ activo: false, detalle: null });
  this.permisoCuentaForm.reset();
  this.initPermisoForm();
}
  usuarioSeleccionado: any = null;
  // 🌟 1. ESTRUCTURA DEL FORMULARIO DIGITAL (Obvia nombres rígidos de RRHH)
 initPermisoForm() {
  this.permisoCuentaForm = this.fb.group({
    usuario_id: [null, Validators.required], // 🌟 Obligatorio para asegurar que se seleccionó del buscador
    nombre_solicitante: ['', Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    total_dias: [0, [Validators.required, Validators.min(1)]],
    motivo: ['', [Validators.required, Validators.maxLength(600)]]
  });
}
seleccionarUsuario(usuario: any) {
  // 🌟 Guardamos el JSON completo con 'tipo_salario' y 'numero_tipo_salario'
  this.usuarioSeleccionado = usuario; 
  
  this.usuarioBuscadoId.set(usuario.id);
  
  const nombreCompleto = usuario.persona?.nombre_completo || usuario.name;
  this.usuario.set(nombreCompleto);
  this.listaPersonas.set([]);

  // 🌟 Forzamos la actualización de controles reactivos para romper el 'disabled'
  this.permisoCuentaForm.patchValue({
    usuario_id: usuario.id,
    nombre_solicitante: nombreCompleto.trim().toUpperCase()
  });

  // Forzamos a Angular a revaluar el estado de validez del formulario
  this.permisoCuentaForm.updateValueAndValidity();

  this.servicioService.getServiciosPorUsuario(usuario.id).subscribe(res => {
    const servicios = res.data || res.servicios || res;
    this.misServicios.set(servicios);
    
    if (servicios.length > 0) {
      this.servicioService.seleccionarServicio(servicios[0]);
    } else {
      this.turnosDelMes.set([]);
    }
  });
}
  // 🌟 3. CÁLCULO AUTOMÁTICO DE DÍAS (Al cambiar las fechas en el HTML)
  calcularDiasPermiso() {
    const inicio = this.permisoCuentaForm.get('fecha_inicio')?.value;
    const fin = this.permisoCuentaForm.get('fecha_fin')?.value;

    if (inicio && fin) {
      const dateInicio = new Date(inicio);
      const dateFin = new Date(fin);
      
      // Diferencia en milisegundos y conversión a días base
      const diferenciaTiempo = dateFin.getTime() - dateInicio.getTime();
      let diasCalculados = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1;

      if (diasCalculados < 0) diasCalculados = 0;

      this.permisoCuentaForm.patchValue({
        total_dias: diasCalculados
      });
    }
  }
guardarPermisoCuenta() {
  // Si el formulario sigue inválido por fechas o motivo, abortamos la ejecución
  if (this.permisoCuentaForm.invalid) {
    console.warn('Formulario inválido. Verifica los campos requeridos.');
    return;
  }

  const datosFormulario = this.permisoCuentaForm.getRawValue();

  // Extraemos las propiedades mapeadas de tu tabla 'personas' en HeidiSQL
  const personaExtraida = this.usuarioSeleccionado?.persona || {};

  const datosEnvio = {
    fecha_inicio: datosFormulario.fecha_inicio,
    fecha_fin: datosFormulario.fecha_fin,
    total_dias: datosFormulario.total_dias,
    motivo: datosFormulario.motivo,
    nombre_solicitante: datosFormulario.nombre_solicitante,
    persona: {
      nombre_completo: personaExtraida.nombre_completo || datosFormulario.nombre_solicitante,
      tipo_salario: personaExtraida.tipo_salario || 'TGN', // Resguardo por defecto según tu DB
      numero_tipo_salario: personaExtraida.numero_tipo_salario || '..........'
    }
  };

  console.log('Enviando y renderizando Formato 6:', datosEnvio);

  try {
    // Alerta visual mediante Signals
    const nombreParaAlerta = datosEnvio.persona.nombre_completo || 'TRABAJADOR';
    this.alertaPermisoActivo.set({
      activo: true,
      detalle: `Requerimiento en proceso: Permiso a Cuenta de Vacación para ${nombreParaAlerta} desde el ${datosEnvio.fecha_inicio} hasta el ${datosEnvio.fecha_fin} (${datosEnvio.total_dias} Días).`
    });

    // Ejecutamos el motor de jsPDF pasándole el objeto armado
    this.generarFormato6PDF(datosEnvio);

    // Reseteamos el modal de forma limpia
    this.permisoCuentaForm.reset();
    this.initPermisoForm();
    this.usuarioSeleccionado = null; 

  } catch (error) {
    console.error('Error crítico al procesar la solicitud:', error);
  }
}
// 📄 Función constructora del documento institucional optimizada contra desbordamientos
private generarFormato6PDF(datos: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. EXTRAER INFORMACIÓN DESDE TU ESTRUCTURA REAL DEL BACKEND
  const persona = datos.persona || {};
  
  const itemVal = persona.tipo_salario ? persona.tipo_salario.toUpperCase() : '..........';
  const nroItemVal = persona.numero_tipo_salario ? persona.numero_tipo_salario : '..........';
  
  const nombreTrabajador = (persona.nombre_completo || datos.nombre_solicitante || 'TRABAJADOR').trim().toUpperCase();

  // --- ENCABEZADO INSTITUCIONAL ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('G.A.D.T.', 15, 20);
  
  doc.setFontSize(13);
  doc.text('Solicitudes de Permiso', 105, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Unidad de Recursos Humanos', 105, 25, { align: 'center' });
  doc.text('Hospital Regional San Juan de Dios', 105, 30, { align: 'center' });

  // --- RECUADRO DE ÍTEM (Esquina Superior Derecha) ---
  doc.rect(148, 15, 47, 18); 
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`ITEM: ${itemVal}`, 151, 21);
  doc.text(`N° ITEM: ${nroItemVal}`, 151, 28);

  // --- TÍTULO DEL FORMATO ---
  doc.line(15, 38, 195, 38);
  doc.setFontSize(12);
  doc.text('FORMATO "6" PERMISO A CUENTA DE VACACIÓN', 105, 44, { align: 'center' });
  doc.line(15, 48, 195, 48);

  // --- FECHA DE EMISIÓN ---
  const fechaHoy = new Date();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Tarija, .....${fechaHoy.getDate()}..... de .....${fechaHoy.toLocaleString('es-ES', { month: 'long' })}..... del .....${fechaHoy.getFullYear()}.....`, 15, 58);

  // --- DESTINATARIO ---
  doc.setFont('helvetica', 'bold');
  doc.text('Señor:', 15, 70);
  doc.setFont('helvetica', 'normal');
  doc.text('Lic. Yerko López Romero', 15, 76);
  doc.setFont('helvetica', 'bold');
  doc.text('Jefe Recursos Humanos Hospital Regional San Juan de Dios', 15, 82);
  doc.text('Presente.-', 15, 88);

  // --- REFERENCIA Y CUERPO ---
  doc.text('REFERENCIA.- PERMISO A CUENTA DE VACACION', 15, 102);
  doc.line(15, 103, 106, 103); 

  doc.setFont('helvetica', 'normal');
  doc.text('A través de la presente, me dirijo a su autoridad para solicitar permiso a cuenta de Vacación', 15, 114);
  doc.text('según el siguiente detalle:', 15, 120);

  // --- DETALLE DE FECHAS Y DÍAS ---
  doc.setFont('helvetica', 'bold');
  doc.text('DE FECHA:', 15, 135);
  doc.setFont('helvetica', 'normal');
  doc.text(`${datos.fecha_inicio || '.................'}`, 38, 135);
  doc.line(36, 136, 65, 136); 

  doc.setFont('helvetica', 'bold');
  doc.text('HASTA LA FECHA:', 72, 135);
  doc.setFont('helvetica', 'normal');
  doc.text(`${datos.fecha_fin || '.................'}`, 110, 135);
  doc.line(108, 136, 138, 136); 

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DÍAS', 145, 135);
  doc.rect(172, 127, 15, 12); 
  doc.setFontSize(14);
  doc.text(`${datos.total_dias || '0'}`, 179, 135, { align: 'center' });

  // --- MOTIVO DINÁMICO ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Por el siguiente Motivo / Justificación:', 15, 155);
  
  doc.setFont('helvetica', 'italic');
  const lineasMotivo = doc.splitTextToSize(datos.motivo || 'Sin observaciones.', 175);
  doc.text(lineasMotivo, 15, 163);

  // 🚀 CÁLCULO DINÁMICO DE ALTURA OBLIGATORIO:
  // Cada línea de texto a tamaño 11 toma aprox 5mm de interlineado básico
  const alturaMotivoOcupado = lineasMotivo.length * 5; 
  let puntoYActual = 163 + alturaMotivoOcupado + 12; // Dejamos un margen controlado para la despedida

  // --- DESPEDIDA (Empujada dinámicamente) ---
  doc.setFont('helvetica', 'normal');
  doc.text('Sin otro particular me despido con las consideraciones más distinguidas.', 15, puntoYActual);

  // --- SECCIÓN DE FIRMAS (Empujada dinámicamente) ---
  const lineaFirmaY = puntoYActual + 30; // 30mm abajo de la despedida
  
  doc.line(20, lineaFirmaY, 90, lineaFirmaY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Firma Solicitante', 55, lineaFirmaY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${nombreTrabajador}`, 20, lineaFirmaY + 11);

  doc.line(120, lineaFirmaY, 190, lineaFirmaY);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma y Sello del Jefe Servicio/Unidad', 155, lineaFirmaY + 5, { align: 'center' });

  const lineaSubdirectorY = lineaFirmaY + 30; // 30mm abajo del bloque anterior de firmas
  doc.line(70, lineaSubdirectorY, 140, lineaSubdirectorY);
  doc.text('Firma y Sello del Sub Director del Servicio o Unidad', 105, lineaSubdirectorY + 5, { align: 'center' });

  // --- NOTA LEGAL INFERIOR (Fija abajo para no flotar feo) ---
  doc.line(15, 275, 195, 275);
  doc.setFontSize(7.5);
  const notaLegal = 'NOTA.- Toda nota de solicitud de permiso debe ser presentada 48 horas antes del permiso, en caso de emergencia la misma debe ser autorizada con su jefe inmediato superior ANTES del permiso y ser entregada el día hábil siguiente al permiso realizado.';
  const lineasNota = doc.splitTextToSize(notaLegal, 180);
  doc.text(lineasNota, 15, 280);

  // Descarga del PDF con el nombre real
  doc.save(`Formato_6_Permiso_${nombreTrabajador.replace(/\s+/g, '_')}.pdf`);
}
  // --- MÉTODOS MANTENIDOS SIN ALTERACIÓN ---
  private obtenerIdDesdeToken(): number | null {
    const token = this.authService.getToken();
    if (!token || token.split('.').length !== 3) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const payload = JSON.parse(jsonPayload);
      return payload.sub ? Number(payload.sub) : null;
    } catch (e) {
      return null;
    }
  }

  public esInicio = computed(() => {
    const url = this.urlSignal();
    return url === '/dashboard' || url === '/dashboard/';
  });

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

  cargarResumenVacaciones() {
    const userId = Number(localStorage.getItem('usuario_id')); 
    if (userId) {
      this.vacacionService.getHistorialByUsuario(userId).subscribe({
        next: (res) => {
          const ultimaAprobada = res.historial?.find((v: any) => v.estado === 1);
          if (ultimaAprobada) {
            this.saldoRestante = ultimaAprobada.saldo_restante;
            this.totalDerecho = ultimaAprobada.total_dias_derecho;
          } else {
            this.saldoRestante = 15;
            this.totalDerecho = 15;
          }
          this.diasConsumidos = this.totalDerecho - this.saldoRestante;
        },
        error: (err) => console.error('Error al cargar saldo de vacaciones', err)
      });
    }
  }

  cargarTurnos(servicioId: number) {
    const idParaConsulta = this.usuarioBuscadoId() ?? this.obtenerIdDesdeToken();
    if (!idParaConsulta) return;
    const mes = this.mesVisualizado(); 
    const anio = this.anioVisualizado();
    this.servicioService.getTurnosPorServicio(idParaConsulta, servicioId, mes, anio).subscribe({
      next: (res: any) => this.turnosDelMes.set(res.data || []),
      error: (err) => console.error(err)
    });
  }

  buscarUsuario(valor: string) {
    if (!valor || valor.trim() === '') {
      this.restablecerVistaPropia();
      return;
    }
    if (valor.length >= 3) {
      this.servicioService.buscarProfesionales(valor).subscribe({
        next: (res: any) => this.listaPersonas.set(res),
        error: (err: any) => console.error(err)
      });
    }
  }

  

  cargarMisServicios() {
    this.servicioService.getServiciosInicio().subscribe({
      next: (response) => {
        const serviciosAsignados = response.data || [];
        this.misServicios.set(serviciosAsignados); 
        if (serviciosAsignados.length > 0 && !this.servicioActivo()) {
          this.servicioService.seleccionarServicio(serviciosAsignados[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

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
    const partes = horarioCompleto.split(' ');
    if (partes.length >= 5) {
        const horaInicio = partes[1].substring(0, 5);
        const horaFin = partes[4].substring(0, 5);
        return `${horaInicio} - ${horaFin}`;
    }
    return horarioCompleto;
  }

  generarPDFMensualGeneral(): void {
    this._reporteMensualService.solicitarReporteActual();
  }

  irAFormulario(tipo: string) {
    this.router.navigate(['/administracion/vacaciones/nuevo'], { queryParams: { tipo: tipo } });
  }

  seleccionar(servicio: any) {
    this.servicioService.seleccionarServicio(servicio);
  }

  toggleSidebar() { this.sidebarVisible.update(v => !v); }
  logout() { localStorage.removeItem('token'); this.router.navigate(['/login']); }

  generarPDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const user = this.usuario().toUpperCase();
    const servicioActivo = this.servicioActivo()?.nombre || 'Sin Servicio';

    doc.setFillColor(...PDF_COLORS['VERDE_HOSPITAL']);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS['BLANCO']);
    doc.text('HOSPITAL SAN JUAN DE DIOS', 15, 13);
    
    doc.setTextColor(...PDF_COLORS['VERDE_OSCURO']);
    doc.setFontSize(10);
    doc.text('REPORTE MENSUAL DE GUARDIAS', 15, 28);

    doc.setFillColor(...PDF_COLORS['FONDO_MENTA']);
    doc.setDrawColor(225, 233, 229); 
    doc.roundedRect(15, 33, 180, 18, 2, 2, 'FD');

    doc.setFontSize(9); 
    doc.setTextColor(...PDF_COLORS['TEXTO_SUAVE']);
    doc.text(`PROFESIONAL: ${this.nombreOriginal()}`, 14, 42); 
    doc.text(`SERVICIO: ${servicioActivo}`, 14, 47);
    doc.text(`FECHA EMISIÓN: ${this.fechaActual()}`, 280, 42, { align: 'right' });
    doc.text(`GESTIÓN: 2026`, 280, 47, { align: 'right' }); 

    autoTable(doc, {
      startY: 55,
      head: [['FECHA', 'ÁREA / UNIDAD', 'TURNO', 'HORARIO']],
      body: [...this.turnosDelMes()]
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .map(t => [t.fecha, t.area_nombre || 'General / No especificado', t.nombre_turno, this.extraerHora(t.horario)]),
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS['VERDE_HOSPITAL'], halign: 'center', fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3, lineColor: [225, 233, 229] },
      alternateRowStyles: { fillColor: PDF_COLORS['FONDO_MENTA'] },
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' } }
    });

    doc.save(`Rol_Guardias_${user.replace(/\s+/g, '_')}.pdf`);
  }
}