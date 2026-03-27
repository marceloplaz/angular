import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnoService } from '../../services/turno';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html'
})
export class TurnosComponent implements OnInit {
  private turnoService = inject(TurnoService);
  private cdRef = inject(ChangeDetectorRef);

  // Propiedades
  servicios: any[] = [];
  categorias: any[] = [];
  mesesDisponibles: any[] = [];
  semanasDisponibles: any[] = [];
  personalAgrupado: any[] = []; 
  listaTurnos: any[] = [];
  
  filters = { 
    servicio_id: null as any, 
    categoria_id: '' as any,
    gestion: 2026, 
    mes_id: null as any, 
    semana_id: null as any 
  };

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  cargando: boolean = false;
  mostrarModal = false;
  personalSeleccionado: any = null;
  diaSeleccionado: string = '';
  turnoIdSeleccionado: any = null;

  ngOnInit() {
    this.cargarCategorias();
    this.cargarTiposDeTurnos();
    this.cargarConfiguracionInicial();
  }

  // ✅ Método faltante 1
  cargarCategorias() {
    this.turnoService.getCategorias().subscribe({
      next: (res: any) => {
        this.categorias = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err) => console.error("Error categorías", err)
    });
  }

  // ✅ Método faltante 2
  cargarTiposDeTurnos() {
    this.turnoService.getTurnos().subscribe({
      next: (res: any) => {
        this.listaTurnos = res.data || res;
        this.cdRef.detectChanges();
      },
      error: (err) => console.error("Error tipos turnos", err)
    });
  }

  cargarConfiguracionInicial() {
    this.turnoService.getServicios().subscribe((res: any) => {
      this.servicios = res.data;
      if (this.servicios.length > 0) this.filters.servicio_id = this.servicios[0].id;
      
      this.turnoService.getConfiguracionCalendario().subscribe((resCal: any) => {
        const data = resCal.data || resCal;
        const gestionActual = data.gestiones?.find((g: any) => g.año == this.filters.gestion);
        if (gestionActual) {
          this.mesesDisponibles = gestionActual.meses;
          const mesActual = this.mesesDisponibles.find((m: any) => m.numero_mes == data.mes_actual) || this.mesesDisponibles[0];
          if (mesActual) {
            this.filters.mes_id = mesActual.id;
            this.semanasDisponibles = mesActual.semanas;
            this.filters.semana_id = this.semanasDisponibles[0]?.id;
          }
        }
        this.cargarTurnos();
      });
    });
  }

  onFilterChange() {
    this.personalAgrupado = [];
    this.cargarTurnos();
  }

  cargarTurnos() {
    if (!this.filters.servicio_id || !this.filters.semana_id) return;
    this.cargando = true;
    this.cdRef.detectChanges();

    this.turnoService.getEquipoPorFiltros(this.filters.servicio_id, this.filters.categoria_id, this.filters.semana_id)
      .subscribe({
        next: (res: any) => {
          this.personalAgrupado = res.equipo_visible || res.data || res;
          this.cargando = false;
          this.cdRef.detectChanges();
        },
        error: () => { 
          this.cargando = false; 
          this.cdRef.detectChanges(); 
        }
      });
  }

guardarAsignacion() {
  if (!this.turnoIdSeleccionado) {
    alert("Por favor seleccione un turno");
    return;
  }

  // Preparamos los datos exactamente como los espera tu API de Laravel
  const payload = {
    usuario_id: this.personalSeleccionado.usuario_id,
    servicio_id: this.filters.servicio_id,
    turno_id: this.turnoIdSeleccionado,
    semana_id: this.filters.semana_id,
    mes_id: this.filters.mes_id,
    gestion_id: 1, // Ajusta según tu lógica de gestiones
    fecha: this.obtenerFechaReal(this.diaSeleccionado),
    estado: 'programado'
  };

  this.turnoService.asignarTurno(payload).subscribe({
    next: (res: any) => {
      console.log("Respuesta del servidor:", res);
      
      // 1. Cerramos el modal inmediatamente
      this.cerrarModal();

      // 2. Limpiamos la tabla para que el usuario vea el refresco
      this.personalAgrupado = [];
      
      // 3. Volvemos a llamar al servidor para traer los datos nuevos
      // donde ya vendrá el turno que acabamos de guardar
      this.cargarTurnos();

      // 4. Forzamos a Angular a procesar los cambios visuales
      this.cdRef.detectChanges();
    },
    error: (err) => {
      console.error("Error al guardar:", err);
      alert("Error al guardar el turno. Revisa la consola de desarrollador.");
    }
  });
}


  abrirModalAsignar(personal: any, dia: string) {
    this.personalSeleccionado = { ...personal };
    this.diaSeleccionado = dia;
    this.turnoIdSeleccionado = null;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }
obtenerTurnoAsignado(usuario: any, nombreDiaColumna: string) {
  if (!usuario.turnos || usuario.turnos.length === 0) return null;
  
  const fechaBuscada = this.obtenerFechaReal(nombreDiaColumna);
  
  // Debug para consola: borra esto después de probar
  // console.log(`Buscando para ${usuario.usuario_nombre} en fecha: ${fechaBuscada}`);

  // Buscamos el turno que coincida con la fecha de la columna
  return usuario.turnos.find((t: any) => t.fecha === fechaBuscada);
}
 
// Calcula las horas de un solo turno para mostrar en el badge (ej: 12h)
obtenerHorasSolo(horario: string): number {
  if (!horario || !horario.includes(' - ')) return 0;
  try {
    const [inicio, fin] = horario.split(' - ');
    const h1 = parseInt(inicio.split(':')[0]);
    const h2 = parseInt(fin.split(':')[0]);
    
    let diff = h2 - h1;
    if (diff <= 0) diff += 24; // Maneja turnos nocturnos que pasan de medianoche
    return diff;
  } catch (e) {
    return 0;
  }
}






calcularTotalHoras(usuario: any): number {
  if (!usuario || !usuario.turnos || usuario.turnos.length === 0) return 0;

  return usuario.turnos.reduce((acc: number, t: any) => {
    if (t.horario && t.horario.includes(' - ')) {
      try {
        const [inicio, fin] = t.horario.split(' - ');
        const h1 = parseInt(inicio.split(':')[0]);
        const h2 = parseInt(fin.split(':')[0]);

        let diff = h2 - h1;
        // Si el turno termina al día siguiente (ej. 19:00 a 07:00)
        if (diff <= 0) diff += 24; 
        
        return acc + diff;
      } catch (e) {
        return acc;
      }
    }
    return acc;
  }, 0);
}
  obtenerFechaReal(nombreDia: string): string {
    const semanaActual = this.semanasDisponibles.find(s => s.id == this.filters.semana_id);
    if (!semanaActual) return '';
    const partes = semanaActual.fecha_inicio.split('-');
    const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    const indiceDia = this.diasSemana.indexOf(nombreDia);
    if (indiceDia !== -1) fecha.setDate(fecha.getDate() + indiceDia);
    return fecha.toISOString().split('T')[0];
  }

  onCambioMes(mesId: any) {
    const mes = this.mesesDisponibles.find(m => m.id == mesId);
    this.semanasDisponibles = mes ? mes.semanas : [];
    if (this.semanasDisponibles.length > 0) {
      this.filters.semana_id = this.semanasDisponibles[0].id;
      this.onFilterChange();
    }
  }
  // ... después de tu método onCambioMes(mesId: any) { ... }

  // 1. REPLICAR SEMANA A TODO EL MES
  onReplicarMes() {
    if (!this.filters.semana_id || !this.filters.servicio_id) {
      alert("Selecciona un servicio y una semana modelo.");
      return;
    }

    if (confirm(`¿Deseas copiar los turnos de la semana actual a todas las semanas de este mes?`)) {
      this.turnoService.replicarSemanaEnMes(
        this.filters.servicio_id, 
        this.filters.mes_id, 
        this.filters.semana_id
      ).subscribe({
        next: (res) => {
          alert("¡Estructura de mes completada!");
          this.cargarTurnos(); // Refresca la tabla
        },
        error: (err) => alert("Error: " + err.error.message)
      });
    }
  }

  // 2. ROTAR PERSONAL AL MES SIGUIENTE
  onRotarMensual() {
    const idMesDestino = prompt("Introduce el ID del MES DESTINO para la rotación:");
    
    if (idMesDestino) {
      this.turnoService.rotarPersonalMensual(
        this.filters.servicio_id,
        this.filters.mes_id, 
        Number(idMesDestino) 
      ).subscribe({
        next: (res: any) => {
          alert("Personal rotado exitosamente.");
          this.cargarTurnos();
        },
        error: (err: any) => alert("Error en rotación: " + err.error.message)
      });
    }
  }

  // 3. VACIAR MES COMPLETO
  onVaciarMes() {
    if (confirm("¡CUIDADO! Se eliminarán TODOS los turnos de este mes. ¿Continuar?")) {
      this.turnoService.vaciarMes(this.filters.servicio_id, this.filters.mes_id).subscribe({
        next: (res) => {
          alert("Calendario del mes limpiado.");
          this.cargarTurnos();
        },
        error: (err) => alert("No se pudo vaciar el mes.")
      });
    }
  }
  vaciarCalendario() {
  // 1. Validamos que los filtros tengan valores seleccionados
  const servicioId = this.filters.servicio_id;
  const mesId = this.filters.mes_id;

  if (!servicioId || !mesId) {
    alert("Por favor, selecciona un servicio y un mes primero.");
    return;
  }

  // 2. Confirmación de seguridad
  if (confirm('¡ATENCIÓN! Se eliminarán TODOS los turnos de este mes para el servicio seleccionado. ¿Deseas continuar?')) {
    
    this.turnoService.vaciarMes(servicioId, mesId).subscribe({
      next: (res: any) => {
        // Mostramos el mensaje de éxito que viene de Laravel
        alert(res.message || "Calendario vaciado correctamente.");
        this.cargarTurnos(); // Recarga la tabla de turnos para que se vea vacía
      },
      error: (err) => {
        // Capturamos el error 403 o cualquier otro del backend
        const errorMsg = err.error?.message || "No se pudo vaciar el mes.";
        alert("Error: " + errorMsg);
        console.error("Detalle del error:", err);
      }
    });
  }
}
}