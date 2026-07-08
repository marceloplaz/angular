
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccesoService } from '../../services/acceso'; // Ajusta los niveles '../' según tu árbol real
import Swal from 'sweetalert2'; 

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
  permisos: any[] = [];

  // Buscador predictivo
  usuariosFiltrados: any[] = [];
  usuarioSeleccionado: any = null;
  terminoBusqueda: string = '';

  // IDs seleccionados para la persistencia
  rolSeleccionadoId: number | null = null;
  serviciosSeleccionados: number[] = [];
  permisosSeleccionados: number[] = [];

  // Inyectamos de forma limpia el servicio de la carpeta común
  constructor(private accesoService: AccesoService) {}

  ngOnInit(): void {
    this.cargarComponentesMatriz();
  }

  cargarComponentesMatriz() {
    this.accesoService.getDatosIniciales().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.roles = res.roles;
          this.servicios = res.servicios;
          this.permisos = res.permisos;
        }
      },
      error: (err) => console.error('Error al inicializar la matriz:', err)
    });
  }

  onBuscarUsuario(event: any) {
    this.terminoBusqueda = event.target.value;
    
    if (this.terminoBusqueda.length < 3) {
      this.usuariosFiltrados = [];
      return;
    }

    this.accesoService.buscarEmpleado(this.terminoBusqueda).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.usuariosFiltrados = res.usuarios;
        }
      }
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
    } else {
      this.rolSeleccionadoId = null;
      this.serviciosSeleccionados = [];
      this.permisosSeleccionados = [];
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