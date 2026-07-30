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
  listaGestiones: any[] = [];
  listaCategorias: any[] = [];
  listaSemanas: any[] = [];
  generarForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private accesoService: AccesoService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarGestiones();      // <-- Única llamada inicial principal
    this.cargarCategorias();  

    this.generarForm = this.fb.group({
      fecha_inicio: [''],
      fecha_fin: ['']
    });
  }

  inicializarFormulario(): void {
    const gestionActual = new Date().getFullYear();

    this.filtroForm = this.fb.group({
      mes_id: [''],        
      gestion: [gestionActual],
      categoria_id: [''],
      semana_id: [null]
    });
  }



  cargarGestiones(): void {
    this.accesoService.getGestiones().subscribe({
      next: (gestiones: any[]) => {
        this.listaGestiones = gestiones; 
        
        const anioActual = new Date().getFullYear();
        const gestionActualEnLista = this.listaGestiones.find(g => g.anio == anioActual) || this.listaGestiones[0];

if (gestionActualEnLista && !this.filtroForm.get('gestion')?.value) {
  this.filtroForm.patchValue({ gestion: gestionActualEnLista.anio });
}
        
        // --- AQUÍ ESTÁ LA CLAVE ---
        // Llamamos a cargarMeses() solo DESPUÉS de que las gestiones ya llegaron y se seleccionó una por defecto.
        this.cargarMeses();
      },
      error: (err: any) => console.error('Error al cargar gestiones:', err)
    });
  }
cargarMeses(): void {
    const gestionSeleccionada = this.filtroForm.get('gestion')?.value;
    const mesActualSeleccionado = this.filtroForm.get('mes_id')?.value; // Guardamos el mes actual
    
    this.accesoService.getMeses(gestionSeleccionada).subscribe({
      next: (meses: any[]) => {
        this.listaMeses = meses;
        if (this.listaMeses.length > 0) {
          // Verificamos si el mes que tenías seleccionado existe en la nueva lista
          const existeMes = this.listaMeses.some(m => m.id == mesActualSeleccionado);

          if (!existeMes) {
            // Solo si no hay uno válido seleccionado, ponemos el primero por defecto (Enero)
            this.filtroForm.patchValue({ mes_id: this.listaMeses[0].id });
          }
          
          this.actualizarSemanas(); 
        } else {
          this.listaMeses = [];
          this.listaSemanas = [];
          this.filtroForm.patchValue({ mes_id: '', semana_id: null });
          this.semanaSeleccionada.emit(null);
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
    const semanaId = event.target ? event.target.value : event;
    const seleccion = this.listaSemanas.find(s => s.id == semanaId);
    
    if (seleccion) {
      this.semanaSeleccionada.emit(seleccion);
          this.generarForm.patchValue({
        fecha_inicio: seleccion.fecha_inicio,
        fecha_fin: seleccion.fecha_fin
      });
    }
  }

 onFiltroCambio() {
    this.cargarMeses(); 
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

guardarModificacionSemana(): void {
    const semanaActual = this.filtroForm.get('semana_id')?.value;
    const { fecha_inicio, fecha_fin } = this.generarForm.value;

    if (!semanaActual) {
      alert('Por favor selecciona una semana para modificar.');
      return;
    }

    const payload = {
      fecha_inicio: fecha_inicio,
      fecha_fin: fecha_fin
    };

    this.accesoService.actualizarSemana(semanaActual, payload).subscribe({
      next: (res) => {
        alert(res.message || 'Semana modificada correctamente');
        this.actualizarSemanas(); // Recarga las semanas para reflejar los cambios
      },
      error: (err) => {
        console.error('Error al modificar semana:', err);
        alert('Ocurrió un error al actualizar la semana.');
      }
    });
  }
  
}