import { Component, inject, signal, input, output, DestroyRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NovedadService } from '../../services/novedad'; // Ajusta según tu ruta
import { ToastrService } from 'ngx-toastr';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-novedad',
  standalone: true,
  // Importamos lo necesario para formularios y directivas básicas
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './novedad.html',
  styleUrl: './novedad.scss'
})
export class NovedadComponent {
  // 1. Inyección de dependencias funcional (v21)
  private readonly _fb = inject(FormBuilder);
  private readonly _novedadService = inject(NovedadService);
  private readonly _toastr = inject(ToastrService);
  private readonly _destroyRef = inject(DestroyRef);
  // 2. Entradas y Salidas basadas en Signals
  // El ID del turno que el usuario seleccionó en la tabla principal
  turnoOrigenId = input.required<number>();
  // Lista de personal médico disponible para el reemplazo
  personalDisponible = input<any[]>([]);
  // Avisa al componente padre (la tabla) que debe refrescar los datos
  novedadGuardada = output<void>();

  // 3. Estado reactivo para la UI
  isSaving = signal(false);

  // 4. Definición del Formulario
  novedadForm = this._fb.nonNullable.group({
    usuario_reemplazo_id: ['', [Validators.required]],
    tipo_novedad: ['permiso', [Validators.required]],
    observacion: ['', [Validators.maxLength(250)]]
  });

  registrarNovedad(): void {
  if (this.novedadForm.invalid || this.isSaving()) return;

  this.isSaving.set(true);

  const payload = {
    ...this.novedadForm.getRawValue(),
    id_origen: this.turnoOrigenId()
  };

  this._novedadService.registrarNovedad(payload)
    // Cambia la línea de abajo para incluir el ref:
    .pipe(takeUntilDestroyed(this._destroyRef)) 
    .subscribe({
      next: (res) => {
        this._toastr.success('Cambio registrado con éxito');
        this.novedadGuardada.emit();
        this.isSaving.set(false);
        this.novedadForm.reset();
      },
      error: (err) => {
        this._toastr.error('Error al procesar');
        this.isSaving.set(false);
      }
    });
}
  
}