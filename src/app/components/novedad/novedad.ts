import { Component, inject, signal, OnInit, DestroyRef, output, input, effect, computed } from '@angular/core';
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

  novedades = signal<any[]>([]); // Fuente original de datos
  searchTerm = signal<string>(''); // Texto del buscador
  cargando = signal<boolean>(false);
  modoRegistro = signal<boolean>(false);
  
  // --- FORMULARIO ---
  novedadForm = this._fb.nonNullable.group({
    usuario_reemplazo_id: ['', [Validators.required]],
    tipo_novedad: ['permiso', [Validators.required]],
    observacion: ['', [Validators.maxLength(250)]]
  });

  constructor() {
    // Sincronización automática: reacciona cuando cambia turnoOrigenId
    effect(() => {
      const id = this.turnoOrigenId();
      if (id) {
        console.log("ID de turno detectado en el hijo:", id);
        this.modoRegistro.set(true);
      }
    });
  }

novedadesFiltradas = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const lista = this.novedades();

    if (!term) return lista;

    return lista.filter(n => 
      n.solicitante?.persona?.nombre_completo?.toLowerCase().includes(term) ||
      n.reemplazo?.persona?.nombre_completo?.toLowerCase().includes(term) ||
      n.asignacion?.servicio?.nombre?.toLowerCase().includes(term) ||
      n.tipo_novedad?.toLowerCase().includes(term)
    );
  });

  

 

  ngOnInit(): void {
    // 1. Cargamos el historial siempre al iniciar
    this.cargarDatos();
    this.obtenerHistorial();
    // 2. Si el padre nos pasa un ID de turno, activamos el formulario automáticamente
    if (this.turnoOrigenId()) {
      this.modoRegistro.set(true);
    }
  }
  
  cargarDatos() {
    this.cargando.set(true);
    this._novedadService.getNovedades().subscribe({
      next: (data) => {
        // IMPORTANTE: .set(data) llena la señal y activa el filtrado
        this.novedades.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  // 3. ACTUALIZAR BUSCADOR
  updateSearch(value: string) {
    this.searchTerm.set(value);
  }
// Signal que limpia la lista que viene del padre
listaPersonalFormateada = computed(() => {
  const lista = this.personalDisponible(); // El input() que ya tienes
  return lista.map(p => ({
    id: p.id || p.usuario_id,
    // Busca el nombre en cualquier propiedad posible
    nombre: p.nombre_completo || p.usuario_nombre || p.nombre || 'Usuario sin nombre'
  }));
});



registrarNovedad(): void {
  // 1. Validamos el formulario y que tengamos el ID del turno de origen
  if (this.novedadForm.invalid || this.cargando() || !this.turnoOrigenId()) {
    this._toastr.warning('Faltan datos obligatorios');
    return;
  }

  this.cargando.set(true);
    
  // 2. Construimos el payload. 
  // 'id_origen' y 'asignacion_id' suelen ser necesarios para vincular la novedad al turno
  const payload = {
    ...this.novedadForm.getRawValue(),
    id_origen: this.turnoOrigenId(), 
    asignacion_id: this.turnoOrigenId() 
  };

  // 3. Llamada al servicio
  this._novedadService.registrarNovedad(payload)
    .pipe(takeUntilDestroyed(this._destroyRef))
    .subscribe({
      next: () => {
        this._toastr.success('Novedad registrada correctamente');
        this.novedadGuardada.emit(); // Avisa al padre para refrescar el calendario
        this.limpiarFormularioDespuesDeGuardar(); // Vuelve a la tabla y resetea
      },
      error: (err) => {
        this.cargando.set(false);
        console.error("Error del servidor:", err.error);
        this._toastr.error(err.error?.message || 'Error al validar datos');
      }
    });
}
confirmarDevolucion(id: number): void {
  this.cargando.set(true);
  this._novedadService.devolverTurno(id)
    .pipe(takeUntilDestroyed(this._destroyRef))
    .subscribe({
      next: () => {
        this._toastr.success('Estado actualizado: Turno Devuelto');
        this.obtenerHistorial(); // Esto refresca la tabla y cambia el badge a verde
      },
      error: (err) => {
        this.cargando.set(false);
        this._toastr.error('No se pudo actualizar el estado');
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
          this.novedades.set(data);
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