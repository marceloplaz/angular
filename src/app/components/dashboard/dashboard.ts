import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';

import { ServicioService } from '../../services/servicios'; 
import { AuthService } from 'src/app/services/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS } from '../../constants/pdf-colors';
import { ReporteMensualService } from '../../services/reporte-mensual';
import { VacacionService } from '../../services/vacacion';
import { TurnoService } from '../../services/turno';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit { 
  private router = inject(Router);
  private servicioService = inject(ServicioService);
  private vacacionService = inject(VacacionService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder); 
  private _reporteMensualService = inject(ReporteMensualService);
  private turnoService = inject(TurnoService);  
  private nombreOriginal = signal<string>('');

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
  public vacacionForm!: FormGroup;  
  public usuarioSeleccionado: any = null;
  public semanasDelMesActual = signal<any[]>([]); 
  public  semanaSeleccionadaId = signal<number | null>(null);

  // 📊 Métrica Global Mensual
  public horasTotalesMes = computed(() => {
    const turnos = this.turnosDelMes();
    if (!turnos || turnos.length === 0) return 0;
    return turnos.reduce((acc, t) => acc + (Number(t.duracion_horas) || 0), 0);
  });

  // 🌟 Sumador Automático para tarjetas filtradas por los límites de la Semana activa
  public horasSemanalesTrabajadas = computed(() => {
    const turnos = this.turnosDelMes();
    const semanaId = this.semanaSeleccionadaId();
    const semanas = this.semanasDelMesActual();

    if (!turnos || turnos.length === 0 || !semanaId || semanas.length === 0) return 0;

    const semanaActiva = semanas.find(s => Number(s.id) === Number(semanaId));
    if (!semanaActiva || !semanaActiva.fecha_inicio || !semanaActiva.fecha_fin) return 0;

    const inicio = new Date(semanaActiva.fecha_inicio).getTime();
    const fin = new Date(semanaActiva.fecha_fin).getTime();

    return turnos.reduce((acc, t) => {
      if (!t.fecha) return acc;
      const fechaTurno = new Date(t.fecha).getTime();
      if (fechaTurno >= inicio && fechaTurno <= fin) {
        return acc + (Number(t.duracion_horas) || 0);
      }
      return acc;
    }, 0);
  });

  private urlSignal = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
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
    
    this.initPermisoForm(); 
    this.cargarResumenVacaciones();

    if (!this.mesVisualizado() || this.mesVisualizado() === 0) {
      this.mesVisualizado.set(new Date().getMonth() + 1);
    }
    if (!this.anioVisualizado() || this.anioVisualizado() === 0) {
      this.anioVisualizado.set(new Date().getFullYear());
    }

    this.generarSemanasDelMes();

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

    this.vacacionForm = this.fb.group({
      es_solo_reemplazo: [false],
      nombre_solicitante: ['', Validators.required],
      servicio_nombre: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      funcionario_reemplazo: [''],
      gestion_vacacion: ['', Validators.required], 
      dias_concedidos: [0, Validators.required],
      dias_descuento: [0, Validators.required],
      saldo_restante: [0, Validators.required]
    });

    this.vacacionForm.get('fecha_inicio')?.valueChanges.subscribe(() => this.calcularDiasVacacion());
    this.vacacionForm.get('fecha_fin')?.valueChanges.subscribe(() => this.calcularDiasVacacion());
    this.vacacionForm.get('dias_derecho')?.valueChanges.subscribe(() => this.calcularDiasVacacion());
    
    this.vacacionForm.get('es_solo_reemplazo')?.valueChanges.subscribe((esReemplazo) => {
      const reemplazoCtrl = this.vacacionForm.get('funcionario_reemplazo');
      if (esReemplazo) {
        reemplazoCtrl?.setValidators([Validators.required]);
      } else {
        reemplazoCtrl?.clearValidators();
      }
      reemplazoCtrl?.updateValueAndValidity();
    });
  }

  restablecerVistaPropia() {
    this.turnosDelMes.set([]); 
    this.misServicios.set([]); 
    this.usuarioBuscadoId.set(null);
    this.usuario.set(this.nombreOriginal()); 
    this.cargarMisServicios(); 
    
    this.alertaPermisoActivo.set({ activo: false, detalle: null });
    this.permisoCuentaForm.reset();
    this.initPermisoForm();
    this.usuarioSeleccionado = null;
  }

  initPermisoForm() {
    this.permisoCuentaForm = this.fb.group({
      usuario_id: [null, Validators.required], 
      nombre_solicitante: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      total_dias: [0, [Validators.required, Validators.min(1)]],
      motivo: ['', [Validators.required, Validators.maxLength(600)]]
    });
  }

  obtenerTurnosDelDia(dia: number | null): any[] {
  if (!dia) return [];
  
  // Filtramos la señal turnosDelMes() para traer todos los del día actual
  return this.turnosDelMes().filter(turno => {
    if (!turno.fecha) return false;
    
    // Si tu backend manda la fecha como string (Ej: "2026-05-08"), la procesamos:
    // Evitamos desfases de zona horaria dividiendo la cadena directamente
    const partes = turno.fecha.split('-'); 
    const diaTurno = parseInt(partes[2], 10);
    
    return diaTurno === dia;
  });
}
  calcularDiasVacacion() {
    const inicio = this.vacacionForm.get('fecha_inicio')?.value;
    const fin = this.vacacionForm.get('fecha_fin')?.value;
    const derechoTotal = Number(this.vacacionForm.get('dias_derecho')?.value) || 0;

    if (inicio && fin) {
      const pInicio = inicio.split('-');
      const pFin = fin.split('-');

      const dateInicio = new Date(Number(pInicio[0]), Number(pInicio[1]) - 1, Number(pInicio[2]));
      const dateFin = new Date(Number(pFin[0]), Number(pFin[1]) - 1, Number(pFin[2]));
      
      const diferenciaTiempo = dateFin.getTime() - dateInicio.getTime();
      let diasCalculados = Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1;

      if (diasCalculados < 0) diasCalculados = 0;
      const saldo = derechoTotal - diasCalculados;

      this.vacacionForm.patchValue({
        dias_concedidos: diasCalculados,
        saldo_restante: saldo < 0 ? 0 : saldo
      }, { emitEvent: false });
    }
  }

  seleccionarUsuario(usuario: any) {
    this.usuarioSeleccionado = usuario; 
    this.usuarioBuscadoId.set(usuario.id);
    
    const nombreCompleto = (usuario.persona?.nombre_completo || usuario.name || '').trim().toUpperCase();
    this.usuario.set(nombreCompleto);
    this.listaPersonas.set([]);

    this.permisoCuentaForm.patchValue({
      usuario_id: usuario.id,
      nombre_solicitante: nombreCompleto
    });
    this.permisoCuentaForm.updateValueAndValidity();

    const servicioAsignado = usuario.persona?.servicio_nombre || 'HEMODIALISIS';
    this.vacacionForm.patchValue({
      nombre_solicitante: nombreCompleto,
      servicio_nombre: servicioAsignado.toUpperCase()
    });

    if (usuario.persona?.dias_derecho) {
      this.vacacionForm.patchValue({ dias_derecho: usuario.persona.dias_derecho });
    }

    this.servicioService.getServiciosPorUsuario(usuario.id).subscribe(res => {
      const servicios = res.data || res.servicios || res;
      this.misServicios.set(servicios);
        
      if (servicios.length > 0) {
        this.servicioService.seleccionarServicio(servicios[0]);
        this.vacacionForm.patchValue({ servicio_nombre: servicios[0].nombre.toUpperCase() });
      } else {
        this.turnosDelMes.set([]);
      }
      this.generarSemanasDelMes();
    });
  }

  generarSemanasDelMes() {
    const mesId = this.mesVisualizado(); 

    this.turnoService.getSemanasPorMes(mesId).subscribe({
      next: (res: any) => {
        let todasLasSemanas: any[] = [];

        if (res && res.gestiones) {
          res.gestiones.forEach((gestion: any) => {
            if (gestion.meses) {
              gestion.meses.forEach((mes: any) => {
                if (Number(mes.id) === Number(mesId) && mes.semanas) {
                  todasLasSemanas = [...todasLasSemanas, ...mes.semanas];
                }
              });
            }
          });
        }

        if (todasLasSemanas.length === 0 && res.gestiones) {
          res.gestiones.forEach((g: any) => {
            if (g.meses) {
              g.meses.forEach((m: any) => {
                if (m.semanas) {
                  const filtradas = m.semanas.filter((s: any) => Number(s.mes_id) === Number(mesId));
                  todasLasSemanas = [...todasLasSemanas, ...filtradas];
                }
              });
            }
          });
        }

        const semanasMapped = todasLasSemanas.map((sem: any) => {
          const inicio = sem.fecha_inicio || '';
          const fin = sem.fecha_fin || '';

          return {
            id: sem.id, 
            label: `Semana ${sem.numero_semana} (${inicio} al ${fin})`,
            fecha_inicio: inicio,
            fecha_fin: fin
          };
        });

        this.semanasDelMesActual.set(semanasMapped);
        
        if (semanasMapped.length > 0) {
          this.cambiarSemanaDashboard(semanasMapped[0].id);
        }
      },
      error: (err: any) => { 
        console.error('Error al mapear la configuración del calendario:', err);
        this.semanasDelMesActual.set([]);
      }
    });
  }

  cambiarSemanaDashboard(semanaId: number) {
    if (!semanaId) return;
    this.semanaSeleccionadaId.set(semanaId);
  }

  /**
   * 🌟 CÁLCULO DE RESUMEN SEMANAL PARA GRID CALENDARIO HTML
   * Filtra dinámicamente el arreglo plano de días del mes de 7 en 7
   */
 public obtenerResumenSemana(inicio: number, fin: number): { dias: number, horas: number } {
    let diasTrabajados = 0;
    let horasTotales = 0;
    const listadoDias = this.diasDelMes();

    for (let i = inicio; i <= fin; i++) {
      const dia = listadoDias[i];
      if (dia) {
        // Usamos obtenerTurnosDelDia para capturar todos los turnos del día (Rayos X, Emergencias, etc.)
        const turnosDelDia = this.obtenerTurnosDelDia(dia); 
        
        if (turnosDelDia && turnosDelDia.length > 0) {
          diasTrabajados++; // Cuenta como día trabajado si tiene al menos un turno
          
          // Iteramos sobre todos los turnos de ese día para no ignorar ninguno
          turnosDelDia.forEach((t: any) => {
            // Nota: Verifica si tu objeto del backend usa 'duracion_horas', 'horas_duracion' o 'horas'
            horasTotales += Number(t.duracion_horas || t.horas_duracion || t.horas) || 0;
          });
        }
      }
    }
    return { dias: diasTrabajados, horas: horasTotales };
  }

  calcularDiasPermiso() {
    const inicio = this.permisoCuentaForm.get('fecha_inicio')?.value;
    const fin = this.permisoCuentaForm.get('fecha_fin')?.value;

    if (inicio && fin) {
      const pInicio = inicio.split('-');
      const pFin = fin.split('-');

      const dateInicio = new Date(Number(pInicio[0]), Number(pInicio[1]) - 1, Number(pInicio[2]));
      const dateFin = new Date(Number(pFin[0]), Number(pFin[1]) - 1, Number(pFin[2]));
      
      const diferenciaTiempo = dateFin.getTime() - dateInicio.getTime();
      let diasCalculados = Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24)) + 1;

      if (diasCalculados < 0) diasCalculados = 0;

      this.permisoCuentaForm.patchValue({ total_dias: diasCalculados });
    }
  }

  guardarPermisoCuenta() {
    if (this.permisoCuentaForm.invalid) {
      console.warn('Formulario inválido. Verifica los campos requeridos.');
      return;
    }

    const datosFormulario = this.permisoCuentaForm.getRawValue();
    const personaExtraida = this.usuarioSeleccionado?.persona || {};

    const datosEnvio = {
      fecha_inicio: datosFormulario.fecha_inicio,
      fecha_fin: datosFormulario.fecha_fin,
      total_dias: datosFormulario.total_dias,
      motivo: datosFormulario.motivo,
      nombre_solicitante: datosFormulario.nombre_solicitante,
      persona: {
        nombre_completo: personaExtraida.nombre_completo || datosFormulario.nombre_solicitante,
        tipo_salario: personaExtraida.tipo_salario || 'TGN', 
        numero_tipo_salario: personaExtraida.numero_tipo_salario || '..........'
      }
    };

    try {
      const nombreParaAlerta = datosEnvio.persona.nombre_completo || 'TRABAJADOR';
      this.alertaPermisoActivo.set({
        activo: true,
        detalle: `Requerimiento en proceso: Permiso a Cuenta de Vacación para ${nombreParaAlerta} desde el ${datosEnvio.fecha_inicio} hasta el ${datosEnvio.fecha_fin} (${datosEnvio.total_dias} Días).`
      });

      this.generarFormato6PDF(datosEnvio);
      this.permisoCuentaForm.reset();
      this.initPermisoForm();
      this.usuarioSeleccionado = null; 
    } catch (error) {
      console.error('Error crítico al procesar la solicitud:', error);
    }
  }

  private generarFormato6PDF(datos: any) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const formatearFechaLocal = (fechaString: string): string => {
      if (!fechaString) return '.................';
      const partes = fechaString.split('-'); 
      return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaString;
    };

    const persona = datos.persona || {};
    const itemVal = persona.tipo_salario ? persona.tipo_salario.toUpperCase() : '..........';
    const nroItemVal = persona.numero_tipo_salario ? persona.numero_tipo_salario : '..........';
    const nombreTrabajador = (persona.nombre_completo || datos.nombre_solicitante || 'TRABAJADOR').trim().toUpperCase();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('G.A.D.T.', 15, 20);
    
    doc.setFontSize(13);
    doc.text('Solicitudes de Permiso', 105, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Unidad de Recursos Humanos', 105, 25, { align: 'center' });
    doc.text('Hospital Regional San Juan de Dios', 105, 30, { align: 'center' });

    doc.rect(148, 15, 47, 18); 
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ITEM: ${itemVal}`, 151, 21);
    doc.text(`N° ITEM: ${nroItemVal}`, 151, 28);

    doc.line(15, 38, 195, 38);
    doc.setFontSize(12);
    doc.text('FORMATO "6" PERMISO A CUENTA DE VACACIÓN', 105, 44, { align: 'center' });
    doc.line(15, 48, 195, 48);

    const fechaHoy = new Date();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Tarija, .....${fechaHoy.getDate()}..... de .....${fechaHoy.toLocaleString('es-ES', { month: 'long' })}..... del .....${fechaHoy.getFullYear()}.....`, 15, 58);

    doc.setFont('helvetica', 'bold');
    doc.text('Señor:', 15, 70);
    doc.setFont('helvetica', 'normal');
    doc.text('Lic. Yerko López Romero', 15, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('Jefe Recursos Humanos Hospital Regional San Juan de Dios', 15, 82);
    doc.text('Presente.-', 15, 88);

    doc.text('REFERENCIA.- PERMISO A CUENTA DE VACACION', 15, 102);
    doc.line(15, 103, 106, 103); 

    doc.setFont('helvetica', 'normal');
    doc.text('A través de la presente, me dirijo a su autoridad para solicitar permiso a cuenta de Vacación', 15, 114);
    doc.text('según el siguiente detalle:', 15, 120);

    doc.setFont('helvetica', 'bold');
    doc.text('DE FECHA:', 15, 135);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatearFechaLocal(datos.fecha_inicio)}`, 38, 135); 
    doc.line(36, 136, 65, 136); 

    doc.setFont('helvetica', 'bold');
    doc.text('HASTA LA FECHA:', 72, 135);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatearFechaLocal(datos.fecha_fin)}`, 110, 135); 
    doc.line(108, 136, 138, 136); 

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DÍAS', 145, 135);
    doc.rect(172, 127, 15, 12); 
    doc.setFontSize(14);
    doc.text(`${datos.total_dias || '0'}`, 179, 135, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Por el siguiente Motivo / Justificación:', 15, 155);
    
    doc.setFont('helvetica', 'italic');
    const lineasMotivo = doc.splitTextToSize(datos.motivo || 'Sin observaciones.', 175);
    doc.text(lineasMotivo, 15, 163);

    const alturaMotivoOcupado = lineasMotivo.length * 5; 
    let puntoYActual = 163 + alturaMotivoOcupado + 12; 

    doc.setFont('helvetica', 'normal');
    doc.text('Sin otro particular me despido con las consideraciones más distinguidas.', 15, puntoYActual);

    const lineaFirmaY = puntoYActual + 30; 
    
    doc.line(20, lineaFirmaY, 90, lineaFirmaY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Firma Solicitante', 55, lineaFirmaY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${nombreTrabajador}`, 20, lineaFirmaY + 11);

    doc.line(120, lineaFirmaY, 190, lineaFirmaY);
    doc.setFont('helvetica', 'bold');
    doc.text('Firma y Sello del Jefe Servicio/Unidad', 155, lineaFirmaY + 5, { align: 'center' });

    const lineaSubdirectorY = lineaFirmaY + 30; 
    doc.line(70, lineaSubdirectorY, 140, lineaSubdirectorY);
    doc.text('Firma y Sello del Sub Director del Servicio o Unidad', 105, lineaSubdirectorY + 5, { align: 'center' });

    doc.line(15, 275, 195, 275);
    doc.setFontSize(7.5);
    const notaLegal = 'NOTA.- Toda nota de solicitud de permiso debe ser presentada 48 horas antes del permiso, en caso de emergencia la misma debe ser autorizada con su jefe inmediato superior ANTES del permiso y ser entregada el día hábil siguiente al permiso realizado.';
    const lineasNota = doc.splitTextToSize(notaLegal, 180);
    doc.text(lineasNota, 15, 280);

    doc.save(`Formato_6_Permiso_${nombreTrabajador.replace(/\s+/g, '_')}.pdf`);
  }

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
      this.listaPersonas.set([]);
      this.restablecerVistaPropia();
      return;
    }
    if (valor.length >= 3) {
      this.servicioService.buscarProfesionales(valor).subscribe({
        next: (res: any) => this.listaPersonas.set(res),
        error: (err: any) => console.error(err)
      });
    } else {
      this.listaPersonas.set([]);
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
    
    doc.text(`FECHA EMISIÓN: ${this.fechaActual()}`, 195, 42, { align: 'right' });
    doc.text(`GESTIÓN: 2026`, 195, 47, { align: 'right' }); 

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

  guardarSolicitudVacacion(): void {
    if (this.vacacionForm.invalid) {
      return;
    }

    const formularioRaw = this.vacacionForm.getRawValue(); 
    const datosSolicitud = {
      ...formularioRaw,
      gestion_vacacion: formularioRaw.gestion_vacacion 
    };

    try {
      const blobPdf = this.generarPDFSolicitudVacacionAnual(datosSolicitud);
      const urlVistaPrevia = window.URL.createObjectURL(blobPdf);
      const ventanaImpresion = window.open(urlVistaPrevia);
      
      if (ventanaImpresion) {
        ventanaImpresion.focus();
      } else {
        const enlaceTemporal = document.createElement('a');
        enlaceTemporal.href = urlVistaPrevia;
        enlaceTemporal.download = `Solicitud_Vacacion_${datosSolicitud.nombre_solicitante.replace(/\s+/g, '_')}.pdf`;
        enlaceTemporal.click();
      }
      console.log('Vista previa del PDF desplegada con éxito.');
    } catch (error) {
      console.error('Error al generar la vista previa del PDF:', error);
    }
  }

  /**
   * 🌟 RECONSTRUCCIÓN COMPLETA DE BOLETA DE VACACIÓN
   * Cierra limpiamente el cuadro técnico de Recursos Humanos
   */
  private generarPDFSolicitudVacacionAnual(datos: any): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const formatearFechaLocal = (fechaString: string): string => {
      if (!fechaString) return '.................';
      const partes = fechaString.split('-');
      return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaString;
    };

    const nombreTrabajador = (datos.nombre_solicitante || 'TRABAJADOR').trim().toUpperCase();
    const servicio = (datos.servicio_nombre || 'NUTRICION').trim().toUpperCase();
    const esSoloReemplazo = datos.es_solo_reemplazo;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MINISTERIO DE SALUD Y DEPORTES', 15, 15);
    doc.text('HOSPITAL REGIONAL SAN JUAN DE DIOS', 15, 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Unidad de Recursos Humanos - Tarija Bolivia', 15, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const tituloDoc = esSoloReemplazo ? 'REGISTRO DE REEMPLAZO DE PERSONAL' : 'SOLICITUD DE VACACIÓN';
    doc.text(tituloDoc, 105, 33, { align: 'center' });
    doc.line(15, 36, 195, 36);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.text('El Servidor Público Señor (a):  ___________________________________________________________', 15, 47);
    doc.setFont('helvetica', 'bold');
    doc.text(nombreTrabajador, 63, 46);

    doc.setFont('helvetica', 'normal');
    doc.text('de la Unidad o Servicio de:  _____________________________________________________________', 15, 56);
    doc.setFont('helvetica', 'bold');
    doc.text(servicio, 63, 55);

    if (!esSoloReemplazo) {
      doc.setFont('helvetica', 'normal');
      doc.text('me corresponde por ley, solicito mi Vacación correspondiente de la Gestión:  ___________________', 15, 65);
      doc.setFont('helvetica', 'bold');
      doc.text(datos.gestion_vacacion ? datos.gestion_vacacion.toUpperCase() : '.................', 142, 64);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Se registra la presente boleta exclusivamente para la cobertura y relevo de funciones.', 15, 65);
    }

    doc.setFont('helvetica', 'normal');
    doc.text('Sin otro particular estaré a la espera de su respuesta.', 15, 74);
    doc.text('Atentamente,', 15, 83);

    doc.line(65, 103, 145, 103);
    doc.setFontSize(8.5);
    doc.text('FIRMA SOLICITANTE', 105, 107, { align: 'center' });

    doc.line(15, 113, 195, 113);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Concedo la vacación solicitada por el servidor público, para tal efecto se tomará las siguientes determinaciones:', 15, 121);
    
    doc.text('EMPIEZA el:  __________________   |   HASTA el:  __________________', 15, 131);
    doc.setFont('helvetica', 'bold');
    doc.text(formatearFechaLocal(datos.fecha_inicio), 38, 130);
    doc.text(formatearFechaLocal(datos.fecha_fin), 108, 130);

    doc.setFont('helvetica', 'normal');
    doc.text('En su REMPLAZO queda el Funcionario (a):  _________________________________________________', 15, 141);
    doc.setFont('helvetica', 'bold');
    doc.text(datos.funcionario_reemplazo ? datos.funcionario_reemplazo.toUpperCase() : 'NO ESPECIFICADO / TURNOS ASIGNADOS', 92, 140);

    doc.line(20, 170, 90, 170);
    doc.setFontSize(8.5);
    doc.text('FIRMA JEFE DE UNIDAD O DIVISIÓN', 55, 174, { align: 'center' });

    doc.line(120, 170, 190, 170);
    doc.text('FIRMA SUBDIRECTOR UNIDAD / DIVISIÓN', 155, 174, { align: 'center' });

    doc.line(15, 181, 195, 181);
    
    // 🧱 CIERRE DEL CUADRO DE CONTROL INTERNO RR.HH.
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CUADRO DE VERIFICACIÓN Y CONTROL DE ASISTENCIA (USO EXCLUSIVO RR.HH.)', 15, 190);
    
    doc.rect(15, 195, 180, 35);
    doc.line(15, 204, 195, 204);
    doc.line(75, 195, 75, 230);
    doc.line(135, 195, 135, 230);

    doc.text('DÍAS CONCEDIDOS', 20, 201);
    doc.text('DÍAS DESCUENTO', 80, 201);
    doc.text('SALDO RESTANTE', 140, 201);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text(`${datos.dias_concedidos || 0} días`, 45, 218, { align: 'center' });
    doc.text(`${datos.dias_descuento || 0} días`, 105, 218, { align: 'center' });
    doc.text(`${datos.saldo_restante || 0} días`, 165, 218, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const lineaFinalY = 255;
    doc.line(65, lineaFinalY, 145, lineaFinalY);
    doc.text('RESPONSABLE DE CONTROL Y ASISTENCIA RR.HH.', 105, lineaFinalY + 5, { align: 'center' });

    return doc.output('blob');
  }
}