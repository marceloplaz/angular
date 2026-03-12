import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PersonaService } from '../../../services/persona';
import { Persona } from '../../../interfaces/persona'; // Importación vital
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nuevo-personal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './nuevo-personal.html',
  styleUrl: './nuevo-personal.scss'
})
export class NuevoPersonalComponent {
  private personaService = inject(PersonaService);
  private router = inject(Router);

  // Ahora usamos el tipo 'Persona' en lugar de 'any'
  // Los nombres de campos coinciden EXACTAMENTE con tu interfaz y tu base de datos
  nuevoUsuario: Persona = {
    nombre_completo: '',
    carnet_identidad: '',
    fecha_nacimiento: '',
    genero: 'M',
    telefono: '',
    direccion: '',
    nacionalidad: 'Boliviana',
    tipo_trabajador: 'administrativo',
    cargo: '',
    tipo_salario: 'TGN',
    numero_tipo_salario: '', // Antes era numero_item
    salario_monto: 0,
    estado: true,
    user_id: 1 // Ajustar según el usuario logueado
  };

  guardar() {
    // Validamos que los campos obligatorios no estén vacíos antes de enviar
    if (!this.nuevoUsuario.nombre_completo || !this.nuevoUsuario.carnet_identidad) {
      Swal.fire('Atención', 'Nombre y CI son obligatorios', 'warning');
      return;
    }

    Swal.fire({
      title: 'Procesando registro...',
      text: 'Guardando datos en el sistema hospitalario',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Angular ahora sabe que 'nuevoUsuario' es de tipo 'Persona'
    this.personaService.crearPersona(this.nuevoUsuario).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: '¡Personal Registrado!',
          text: 'Los datos se guardaron correctamente.',
          confirmButtonColor: '#166534',
          timer: 2000
        }).then(() => {
          this.router.navigate(['/dashboard/personal']);
        });
      },
      error: (err) => {
        console.error('Error en el registro:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: err.error?.message || 'Hubo un problema al conectar con el servidor.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }
}