import { Component, inject, signal, OnInit, DestroyRef, output, input,effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NovedadService } from '../../services/novedad';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NovedadListar } from '../../interfaces/novedad';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-novedad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './novedad.html',
  styleUrl: './novedad.scss'
})
export class NovedadComponent implements OnInit {
  private readonly _novedadService = inject(NovedadService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _fb = inject(FormBuilder);
  private readonly _toastr = inject(ToastrService);

  // --- INPUTS (Datos desde el componente Turnos) ---
  turnoOrigenId = input<number | null>(null);
  personalDisponible = input<any[]>([]);
  
  // --- OUTPUTS (Comunicación hacia el padre) ---
  novedadGuardada = output<void>();
  cerrarNovedades = output<void>();

  // --- ESTADOS (Signals) ---
  modoRegistro = signal(false); 
  cargando = signal(false);
  listaNovedades = signal<NovedadListar[]>([]); 

  // --- FORMULARIO ---
  novedadForm = this._fb.nonNullable.group({
    usuario_reemplazo_id: ['', [Validators.required]],
    tipo_novedad: ['permiso', [Validators.required]],
    observacion: ['', [Validators.maxLength(250)]]
  });

  constructor() {
    // 1. Sincronización automática: Cuando llega un ID desde el padre, activamos el formulario
    effect(() => {
      const id = this.turnoOrigenId();
      if (id) {
        console.log("ID de turno detectado en el hijo:", id);
        this.modoRegistro.set(true);
      }
    });
  }

  ngOnInit(): void {
    // 1. Cargamos el historial siempre al iniciar
    this.obtenerHistorial();
    // 2. Si el padre nos pasa un ID de turno, activamos el formulario automáticamente
    if (this.turnoOrigenId()) {
      this.modoRegistro.set(true);
    }
  }
  // --- LÓGICA DE REGISTRO ---
// src/app/components/novedad/novedad.ts

// ... dentro de la clase NovedadComponent ...




registrarNovedad(): void {
  if (this.novedadForm.invalid || this.cargando() || !this.turnoOrigenId()) {
    this._toastr.warning('Faltan datos obligatorios o el ID del turno');
    return;
  }
this.cargando.set(true);
    
    // Construimos el objeto exacto que espera Laravel
    const payload = {
      ...this.novedadForm.getRawValue(),
      id_origen: this.turnoOrigenId(), // Este campo soluciona el error 422 de tu consola
      asignacion_id: this.turnoOrigenId() 
    };

  this._novedadService.registrarNovedad(payload)
    .pipe(takeUntilDestroyed(this._destroyRef))
    .subscribe({
      next: () => {
        this._toastr.success('Novedad registrada correctamente');
        this.novedadGuardada.emit(); 
        this.limpiarFormularioDespuesDeGuardar();
      },
      error: (err) => {
        this.cargando.set(false);
        // Esto te dirá exactamente qué campo falta según Laravel
        console.error("Error del servidor:", err.error);
        this._toastr.error(err.error?.message || 'Error al validar datos');
      }
           });
}
private limpiarFormularioDespuesDeGuardar(): void {
    this.modoRegistro.set(false);
    this.cargando.set(false);
    this.novedadForm.reset({ 
      tipo_novedad: 'permiso' // Asegúrate de que coincida con el valor de tu <option>
    });
    this.obtenerHistorial();
  }
// También agrega esta para evitar otro error en el HTML
cancelarRegistro(): void {
  this.modoRegistro.set(false);
  this.novedadForm.reset({ tipo_novedad: 'permiso' });
}

  // --- LÓGICA DE LISTADO ---
  obtenerHistorial(): void {
    this.cargando.set(true);
    this._novedadService.getNovedades()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res) => {
          const data = (res as any).data || res;
          this.listaNovedades.set(data);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error al obtener novedades:', err);
          this.cargando.set(false);
        }
      });
  }

  // --- CIERRE DEL COMPONENTE ---
  volver(): void {
    this.cerrarNovedades.emit();
  }
}