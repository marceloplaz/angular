
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccesoService } from '../../services/acceso';
import Swal from 'sweetalert2'; 
import { Subject, Subscription } from 'rxjs'; // 2. Importamos las herramientas de control de flujos
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';


@Component({
  selector: 'app-configuracion-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permisos-roles.html',
  styleUrls: ['./permisos-roles.scss']
})
export class PermisosRolesComponent implements OnInit {
  // Catálogos desde la API
  roles: any[] = [];
  servicios: any[] = [];
  categorias: any[] = [];
  permisos: any[] = [];

  // Buscador predictivo
  usuariosFiltrados: any[] = [];
  usuarioSeleccionado: any = null;
  categoriasSeleccionadas: number[] = [];
  terminoBusqueda: string = '';
  rolSeleccionadoId: number | null = null;
  serviciosSeleccionados: number[] = [];
  permisosSeleccionados: number[] = [];

  private buscador$ = new Subject<string>();
  private buscadorSub!: Subscription;

  constructor(private accesoService: AccesoService) {}

 ngOnInit(): void {
  this.cargarComponentesMatriz();
  this.buscadorSub = this.buscador$.pipe(
    debounceTime(400),       
    distinctUntilChanged()   
  ).subscribe(termino => {
        
    this.accesoService.buscarEmpleado(termino).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.usuariosFiltrados = res.usuarios;
        }
      },
      error: (err) => console.error('Error en búsqueda:', err)
    });

  });
}
  ngOnDestroy(): void {
    if (this.buscadorSub) {
      this.buscadorSub.unsubscribe();
    }
  }

  cargarComponentesMatriz() {
    this.accesoService.getDatosIniciales().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.roles = res.roles;
          this.servicios = res.servicios;
          this.categorias = res.categorias || []
          this.permisos = res.permisos;
        }
      },
      error: (err) => console.error('Error al inicializar la matriz:', err)
    });
  }

 onBuscarUsuario(event: any) {
  const termino = event.target.value;
  this.terminoBusqueda = termino;
  
  if (termino.length < 3) {
    this.usuariosFiltrados = [];
    return;
  }

  this.buscador$.next(termino);
}
ejecutarBusquedaEfectiva(termino: string) {
  this.accesoService.buscarEmpleado(termino).subscribe({
    next: (res) => {
      if (res.status === 'success') {
        this.usuariosFiltrados = res.usuarios;
      }
    },
    error: (err) => console.error('Error en búsqueda predictiva:', err)
  });
}

  seleccionarUsuario(user: any) {
    this.usuarioSeleccionado = user;
    this.usuariosFiltrados = [];
    this.terminoBusqueda = user.persona ? user.persona.nombre_completo : user.name;

    // Precarga automática si el usuario ya posee un registro guardado
    if (user.roles && user.roles.length > 0) {
      const rolActivo = user.roles[0];
      this.rolSeleccionadoId = rolActivo.id;
       this.serviciosSeleccionados = rolActivo.servicios ? rolActivo.servicios.map((s: any) => s.id) : [];
      this.permisosSeleccionados = rolActivo.permissions ? rolActivo.permissions.map((p: any) => p.id) : [];
      this.categoriasSeleccionadas = rolActivo.categorias ? rolActivo.categorias.map((c: any) => c.id) : [];
    } else {
      this.rolSeleccionadoId = null;
      this.serviciosSeleccionados = [];
      this.permisosSeleccionados = [];
      this.categoriasSeleccionadas = [];
    }
  }

  toggleServicio(servicioId: number) {
    const index = this.serviciosSeleccionados.indexOf(servicioId);
    if (index > -1) {
      this.serviciosSeleccionados.splice(index, 1);
    } else {
      this.serviciosSeleccionados.push(servicioId);
    }
  }

  toggleCategoria(categoriaId: number) {
    const index = this.categoriasSeleccionadas.indexOf(categoriaId);
    if (index > -1) {
      this.categoriasSeleccionadas.splice(index, 1);
    } else {
      this.categoriasSeleccionadas.push(categoriaId);
    }
  }

  togglePermiso(permisoId: number) {
    const index = this.permisosSeleccionados.indexOf(permisoId);
    if (index > -1) {
      this.permisosSeleccionados.splice(index, 1);
    } else {
      this.permisosSeleccionados.push(permisoId);
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
      next: (res) => {
        if (res.status === 'success') {
          Swal.fire({
            title: '¡Guardado!',
            text: res.message,
            icon: 'success',
            confirmButtonColor: '#2a7953' // Color verde hospital que manejas en tu UI
          });
          
          this.usuarioSeleccionado.roles = [{
            id: this.rolSeleccionadoId,
            servicios: this.serviciosSeleccionados.map(id => ({ id })),
            categorias: this.categoriasSeleccionadas.map(id => ({ id })),
            permissions: this.permisosSeleccionados.map(id => ({ id }))
          }];
        }
      },
      error: (err) => {
        Swal.fire('Error', err.error.message || 'No se pudo guardar la configuración.', 'error');
      }
    });
  }
}