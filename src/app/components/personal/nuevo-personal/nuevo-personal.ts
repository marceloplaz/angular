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

listaCategorias = [
    { id: 1, nombre: 'Categoría 1' },
    { id: 2, nombre: 'Categoría 2' },
    { id: 3, nombre: 'Categoría 3' }
  ];
  
  listaRoles: any[] = [
    { id: 1, name: 'super_admin' },
    { id: 2, name: 'admin' },
    { id: 3, name: 'jefe_servicio' },
    { id: 4, name: 'jefa_enfermeras' },
    { id: 5, name: 'jefa_servicios_generales' },
    { id: 6, name: 'responsable_tecnico' },
    { id: 7, name: 'medico' },
    { id: 8, name: 'enfermera' },
    { id: 9, name: 'manual' },
    { id: 10, name: 'admin_jefe_medico' },
    { id: 11, name: 'admin_jefa_enfermeras' },
    { id: 12, name: 'admin_jefa_servicios_generales' },
    { id: 13, name: 'jefe_medico_servicio' },
    { id: 14, name: 'jefa_enfermeras_servicio' }
  ];

  rolSeleccionadoNombre: string = 'enfermera'; 

  // Es CRITICO que 'telefono' y otros campos estén inicializados
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
      tipo_trabajador: 'Medico', // Valor por defecto (Texto)
      tipo_salario: 'TGN',
      numero_tipo_salario: ''
    }
    }

 

  ngOnInit(): void {}

  guardar() {
    const rolEncontrado = this.listaRoles.find(r => r.name === this.rolSeleccionadoNombre);
    this.nuevoUsuario.roles = [rolEncontrado ? rolEncontrado.id : 8]; 
    this.nuevoUsuario.password_confirmation = this.nuevoUsuario.password;

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
        Swal.fire('¡Éxito!', 'Personal registrado', 'success');
        this.router.navigate(['/dashboard/personal']);
      },
    
      error: (err) => {
  if (err.status === 422) {
    Swal.fire('Error', 'El C.I. o el Correo ya se encuentran registrados', 'warning');
  } else {
    Swal.fire('Error', 'Ocurrió un problema en el servidor', 'error');
  }
}
    });
  }
}