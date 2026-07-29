import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AccesoService } from '../../services/acceso'; 

@Component({
  selector: 'app-semana-mes',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './semana-mes.html',
  styleUrls: ['./semana-mes.scss']
})
export class SemanaMesComponent implements OnInit {
  @Output() semanaSeleccionada = new EventEmitter<any>();

  filtroForm!: FormGroup;
  listaMeses: any[] = [];
  listaCategorias: any[] = [];
  listaSemanas: any[] = [];
  generarForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private accesoService: AccesoService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarMeses();       // <--- 1. Cargamos los meses al iniciar
    this.cargarCategorias();  // <--- 2. Cargamos las categorías al iniciar

    this.generarForm = this.fb.group({
    fecha_inicio: [''],
    fecha_fin: ['']
});

  }

  inicializarFormulario(): void {
    const gestionActual = new Date().getFullYear();

    this.filtroForm = this.fb.group({
      mes_id: [''],         // Iniciamos vacío para que se seleccione tras cargar la lista
      gestion: [gestionActual],
      categoria_id: [''],
      semana_id: [null]
    });
  }

  // Método para obtener los meses desde el backend
  cargarMeses(): void {
    this.accesoService.getMeses().subscribe({
      next: (meses: any[]) => {
        this.listaMeses = meses;
        // Si hay meses, seleccionamos el primero por defecto o dejamos que el usuario elija
        if (this.listaMeses.length > 0 && !this.filtroForm.get('mes_id')?.value) {
          this.filtroForm.patchValue({ mes_id: this.listaMeses[0].id });
          this.actualizarSemanas(); // Actualizamos las semanas del primer mes cargado
        }
      },
      error: (err) => console.error('Error al cargar meses:', err)
    });
  }

  // Método para obtener las categorías desde el backend (igual que en turnos.ts)
  cargarCategorias(): void {
    this.accesoService.getCategorias().subscribe({
      next: (categorias: any[]) => {
        this.listaCategorias = categorias;
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });
  }

  actualizarSemanas(): void {
    const mesId = this.filtroForm.get('mes_id')?.value;
    const categoriaId = this.filtroForm.get('categoria_id')?.value;

    if (mesId) {
      this.accesoService.getSemanasPorMesYCategoria(mesId, categoriaId).subscribe({
        next: (semanas: any[]) => {
          this.listaSemanas = semanas;
          if (this.listaSemanas.length > 0) {
            this.filtroForm.patchValue({ semana_id: this.listaSemanas[0].id });
            this.semanaSeleccionada.emit(this.listaSemanas[0]);
          } else {
            this.filtroForm.patchValue({ semana_id: null });
            this.semanaSeleccionada.emit(null);
          }
        },
        error: (err: any) => { 
          console.error('Error al obtener semanas:', err);
        }
      });
    } else {
      this.listaSemanas = [];
    }
  }

  onSemanaChange(event: any): void {
    const semanaId = event.target.value;
    const seleccion = this.listaSemanas.find(s => s.id == semanaId);
    if (seleccion) {
      this.semanaSeleccionada.emit(seleccion);
    }
  }

  onFiltroCambio() {
    this.actualizarSemanas(); // Unificamos la lógica para que llame a la misma función de actualización
  }

ejecutarGeneracionSemanas(): void {
  const mesId = this.filtroForm.get('mes_id')?.value;
  const categoriaId = this.filtroForm.get('categoria_id')?.value;
  const { fecha_inicio, fecha_fin } = this.generarForm.value;

  if (!mesId || !fecha_inicio || !fecha_fin) {
    alert('Por favor selecciona un mes y define las fechas de inicio y fin.');
    return;
  }

  const payload = {
    mes_id: mesId,
    categoria_id: categoriaId === '' ? null : categoriaId,
    fecha_inicio: fecha_inicio,
    fecha_fin: fecha_fin
  };

  this.accesoService.generarSemanas(payload).subscribe({
    next: (res) => {
      alert(res.message || 'Semanas generadas exitosamente');
      // Recargamos las semanas automáticamente en el select superior
      this.actualizarSemanas();
    },
    error: (err) => {
      console.error('Error al generar semanas:', err);
      alert('Ocurrió un error al generar las semanas.');
    }
  });
}

  
}