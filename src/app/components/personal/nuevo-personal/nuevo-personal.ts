import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonaService } from '../../../services/persona';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nuevo-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './nuevo-personal.html',
  styleUrl: './nuevo-personal.scss'
})
export class NuevoPersonalComponent implements OnInit {
  private personaService = inject(PersonaService);
  private router = inject(Router);

  // Estas listas ahora se llenarán dinámicamente desde el Backend
  listaCategorias: any[] = [];
  listaRoles: any[] = [];
  listaTiposSalario: any[] = [];
  listaTiposTrabajador: any[] = [];

  rolSeleccionadoNombre: string = 'enfermera'; 

  nuevoUsuario = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    categoria_id: 1,
    roles: [] as number[], 
    persona: {
      nombre_completo: '',
      carnet_identidad: '',
      fecha_nacimiento: '1990-01-01',
      genero: 'M',
      telefono: '',
      direccion: '',
      nacionalidad: 'Boliviana',
      tipo_trabajador: 'medico', 
      tipo_salario: 'TGN',
      numero_tipo_salario: ''
    }
  }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  /**
   * Carga todos los datos necesarios para los selectores desde el Backend
   */
  cargarCatalogos(): void {
    this.personaService.getCatalogosFormulario().subscribe({
      next: (res: any) => {
        // Mapeamos la respuesta del servidor a tus variables locales
        this.listaCategorias = res.categorias;
        this.listaRoles = res.roles;
        this.listaTiposSalario = res.tipos_salario;
        this.listaTiposTrabajador = res.tipos_trabajador;
      },
      error: (err) => {
        console.error('Error al cargar catálogos:', err);
      }
    });
  }

  guardar() {
    // Buscamos el ID del rol basado en el nombre seleccionado en el combo
    const rolEncontrado = this.listaRoles.find(r => r.name === this.rolSeleccionadoNombre);
    
    // Si no lo encuentra, por defecto asignamos ID 8 (que suele ser enfermera en tu lista)
    this.nuevoUsuario.roles = [rolEncontrado ? rolEncontrado.id : 8]; 
    this.nuevoUsuario.password_confirmation = this.nuevoUsuario.password;

    // Preparamos el payload con las conversiones numéricas que exige Laravel
    const payload = {
      ...this.nuevoUsuario,
      categoria_id: Number(this.nuevoUsuario.categoria_id),
      persona: {
        ...this.nuevoUsuario.persona,
        numero_tipo_salario: Number(this.nuevoUsuario.persona.numero_tipo_salario)
      }
    };

    this.personaService.crearPersona(payload).subscribe({
      next: (res) => {
        Swal.fire('¡Éxito!', 'Personal registrado correctamente', 'success');
        this.router.navigate(['/dashboard/personal']);
      },
      error: (err) => {
        if (err.status === 422) {
          // Capturamos errores de validación (C.I. duplicado, email duplicado, etc.)
          const validationErrors = err.error.errors;
          let mensaje = 'El C.I. o el Correo ya se encuentran registrados';
          
          if(validationErrors) {
             // Si quieres ver el error específico en consola para depurar
             console.log("Errores de validación:", validationErrors);
          }

          Swal.fire('Atención', mensaje, 'warning');
        } else {
          Swal.fire('Error', 'Ocurrió un problema en el servidor al guardar', 'error');
        }
      }
    });
  }
}