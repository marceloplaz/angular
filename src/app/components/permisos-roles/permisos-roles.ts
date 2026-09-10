import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccesoService } from '../../services/acceso';
import Swal from 'sweetalert2'; 
import { Subject, Subscription } from 'rxjs'; 
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-permisos-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permisos-roles.html',
  styleUrls: ['./permisos-roles.scss']
})
export class PermisosRolesComponent implements OnInit, OnDestroy {
  // Catálogos desde la API
  roles: any[] = [];
  servicios: any[] = [];
  categorias: any[] = [];
  permisos: any[] = [];

  // Buscador predictivo
  usuariosFiltrados: any[] = [];
  usuarioSeleccionado: any = null;
  terminoBusqueda: string = '';
  
  // Asignaciones
  rolSeleccionadoId: number | null = null;
  serviciosSeleccionados: number[] = [];
  categoriasSeleccionadas: number[] = [];
  permisosSeleccionados: number[] = [];

  private buscador$ = new Subject<string>();
  private buscadorSub!: Subscription;

  constructor(private accesoService: AccesoService) {}

  ngOnInit(): void {
    this.cargarComponentesMatriz();

    // Uso de switchMap para cancelar peticiones anteriores y debounceTime para evitar saturar el backend
    this.buscadorSub = this.buscador$.pipe(
      debounceTime(350), 
      distinctUntilChanged(),
      switchMap(termino => this.accesoService.buscarEmpleado(termino))
    ).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.usuariosFiltrados = res.usuarios;
        }
      },
      error: (err) => console.error('Error en búsqueda predictiva:', err)
    });
  }

  ngOnDestroy(): void {
    if (this.buscadorSub) {
      this.buscadorSub.unsubscribe();
    }
  }

  cargarComponentesMatriz() {
    this.accesoService.getDatosIniciales().subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.roles = res.roles;
          this.servicios = res.servicios;
          this.categorias = res.categorias || [];
          this.permisos = res.permisos;
        }
      },
      error: (err) => console.error('Error al inicializar la matriz:', err)
    });
  }

  onBuscarUsuario() {
    const termino = this.terminoBusqueda.trim();
    if (termino.length < 3) {
      this.usuariosFiltrados = [];
      return;
    }
    this.buscador$.next(termino);
  }

  seleccionarUsuario(user: any) {
    this.usuarioSeleccionado = user;
    this.usuariosFiltrados = [];
    this.terminoBusqueda = user.persona ? user.persona.nombre_completo : user.name;

    // Cargar rol base
    if (user.roles && user.roles.length > 0) {
      this.rolSeleccionadoId = user.roles[0].id;
    } else {
      this.rolSeleccionadoId = null;
    }

    // Cargar relaciones directas del usuario o del objeto pivote
    this.serviciosSeleccionados = user.servicios ? user.servicios.map((s: any) => s.id) : [];
    this.categoriasSeleccionadas = user.categorias ? user.categorias.map((c: any) => c.id) : [];
    this.permisosSeleccionados = user.permissions ? user.permissions.map((p: any) => p.id) : [];
  }

  toggleServicio(servicioId: number) {
    this.toggleItem(this.serviciosSeleccionados, servicioId);
  }

  toggleCategoria(categoriaId: number) {
    this.toggleItem(this.categoriasSeleccionadas, categoriaId);
  }

  togglePermiso(permisoId: number) {
    this.toggleItem(this.permisosSeleccionados, permisoId);
  }

  private toggleItem(array: number[], id: number) {
    const index = array.indexOf(id);
    if (index > -1) {
      array.splice(index, 1);
    } else {
      array.push(id);
    }
  }

  guardarConfiguracion() {
    if (!this.usuarioSeleccionado || !this.rolSeleccionadoId) {
      Swal.fire('Atención', 'Por favor, selecciona un usuario y un rol base.', 'warning');
      return;
    }

    const payload = {
      user_id: this.usuarioSeleccionado.id,
      role_id: this.rolSeleccionadoId,
      servicios_ids: this.serviciosSeleccionados,
      categorias_ids: this.categoriasSeleccionadas,
      permisos_ids: this.permisosSeleccionados
    };

    this.accesoService.guardarMatriz(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          Swal.fire({
            title: '¡Guardado!',
            text: res.message || 'Configuración guardada correctamente.',
            icon: 'success',
            confirmButtonColor: '#2a7953'
          });

          // 1. Actualizar el estado local del objeto usuario
          this.usuarioSeleccionado.roles = [{ id: this.rolSeleccionadoId }];
          this.usuarioSeleccionado.servicios = this.serviciosSeleccionados.map(id => ({ id }));
          this.usuarioSeleccionado.categorias = this.categoriasSeleccionadas.map(id => ({ id }));
          this.usuarioSeleccionado.permissions = this.permisosSeleccionados.map(id => ({ id }));

          // 2. Refrescar la sesión/servicios si el usuario modificado es el usuario actualmente autenticado
          if (typeof this.accesoService.notificarCambioPermisos === 'function') {
            this.accesoService.notificarCambioPermisos(this.usuarioSeleccionado.id);
          }
        }
      },
      error: (err) => {
        Swal.fire('Error', err.error?.message || 'No se pudo guardar la configuración.', 'error');
      }
    });
  }
}