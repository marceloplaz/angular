import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonaService } from '../../../services/persona'; 
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-update-personal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-personal.html',
  styleUrls: ['./update-personal.scss']
})
export class UpdatePersonalComponent implements OnInit {
  personaId!: number;
  updateForm!: FormGroup;
  listaCategorias: any[] = [];

  constructor(
    private fb: FormBuilder,
    private personaService: PersonaService,
    private route: ActivatedRoute,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarCatalogos();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.personaId = +id;
        this.cargarDatosPersona();
      }
    });
  }

  initForm(): void {
    this.updateForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      carnet_identidad: ['', Validators.required],
      fecha_nacimiento: [''],
      genero: [''],
      telefono: [''],
      direccion: [''],
      tipo_trabajador: [''],
      nacionalidad: [''],
      tipo_salario: [''],
      fecha_ingreso_institucion: [''],
      numero_tipo_salario: [''],
      user_id: [''],
      name: [''],          
      email: [''],         
      password: [''],      
      categoria_id: ['']   
    });
  }

  cargarCatalogos(): void {
    this.personaService.getCatalogosFormulario().subscribe({
      next: (res: any) => {
        this.listaCategorias = res.categorias || res.data || res;
      },
      error: (err) => console.error('Error al cargar catálogos:', err)
    });
  }

  cargarDatosPersona(): void {
    this.personaService.getPersona(this.personaId).subscribe({
      next: (res: any) => {
        const persona = res.persona || res;
        const usuario = persona.user || {}; 

        this.updateForm.patchValue({
          nombre_completo: persona.nombre_completo,
          carnet_identidad: persona.carnet_identidad,
          fecha_nacimiento: persona.fecha_nacimiento,
          genero: persona.genero,
          telefono: persona.telefono,
          direccion: persona.direccion,
          tipo_trabajador: persona.tipo_trabajador,
          nacionalidad: persona.nacionalidad,
          tipo_salario: persona.tipo_salario,
          fecha_ingreso_institucion: persona.fecha_ingreso_institucion,
          numero_tipo_salario: persona.numero_tipo_salario,
          user_id: persona.user_id,
          name: usuario.name,
          email: usuario.email,
          categoria_id: usuario.categoria_id
        });
      },
      error: (err) => console.error('Error al cargar datos para editar:', err)
    });
  }
actualizarPersonal(): void {
  if (this.updateForm.invalid) {
    alert('Por favor completa los campos requeridos.');
    return;
  }    

  const formValues = this.updateForm.value;

  // Estructura anidada que espera el UserController de Laravel
  const payload: any = {
    name: formValues.name,
    email: formValues.email,
    categoria_id: formValues.categoria_id,
    persona: {
      nombre_completo: formValues.nombre_completo,
      carnet_identidad: formValues.carnet_identidad,
      fecha_nacimiento: formValues.fecha_nacimiento,
      genero: formValues.genero,
      telefono: formValues.telefono,
      direccion: formValues.direccion,
      tipo_trabajador: formValues.tipo_trabajador,
      nacionalidad: formValues.nacionalidad,
      tipo_salario: formValues.tipo_salario,
      fecha_ingreso_institucion: formValues.fecha_ingreso_institucion,
      numero_tipo_salario: formValues.numero_tipo_salario
    }
  };

  // Si el usuario escribió una nueva contraseña, la incluimos
  if (formValues.password) {
    payload.password = formValues.password;
    payload.password_confirmation = formValues.password; // Opcional si usas 'confirmed' en Laravel
  }

  // IMPORTANTE: Asegúrate de pasar el ID del USUARIO (user_id), no el ID de la persona,
  // ya que tu backend actualiza la tabla 'users'.
  const userId = formValues.user_id || this.personaId; 

  this.personaService.updatePersona(userId, payload).subscribe({
    next: (res) => {
      alert(res.message || 'Datos actualizados correctamente');
      this.router.navigate(['/personal']);
    },
    error: (err) => {
      console.error('Error al actualizar:', err);
      alert(err.error?.message || 'Ocurrió un error al actualizar los datos.');
    }
  });
}

  cancelar(): void {
    this.router.navigate(['/personal']);
  }
}