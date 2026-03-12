import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http'; //
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development'; //

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './personal.html'
})
export class PersonalComponent implements OnInit {
  private http = inject(HttpClient);

  public listaPersonas: any[] = [];
  public mostrarModal = false;

  // Objeto vinculado al formulario mediante [(ngModel)]
  public nuevoUsuario: any = {
    name: '',
    email: '',
    password: '',
    categoria_id: '',
    // Campos que irán dentro del objeto 'persona'
    nombre_completo: '',
    carnet_identidad: '',
    genero: 'Masculino',
    telefono: '',
    direccion: '',
    tipo_trabajador: '',
    nacionalidad: 'Boliviana',
    tipo_salario: '',
    numero_tipo_salario: ''
  };

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${environment.apiUrl}/usuarios`, { headers }).subscribe({
      next: (res: any) => {
        this.listaPersonas = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err) => console.error('Error al cargar datos:', err)
    });
  }

  guardarUsuario() {
    const token = localStorage.getItem('token'); //
    
    // 1. Configuramos los Headers con el Token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // 2. Estructuramos el Payload según el "Registro Maestro"
    const payload = {
      name: this.nuevoUsuario.name,
      email: this.nuevoUsuario.email,
      password: this.nuevoUsuario.password,
      password_confirmation: this.nuevoUsuario.password, // Requerido por Laravel
      categoria_id: this.nuevoUsuario.categoria_id,
      roles: [10], // ID de rol por defecto
      persona: { // Objeto anidado indispensable
        nombre_completo: this.nuevoUsuario.nombre_completo,
        carnet_identidad: this.nuevoUsuario.carnet_identidad,
        genero: this.nuevoUsuario.genero,
        telefono: this.nuevoUsuario.telefono,
        direccion: this.nuevoUsuario.direccion,
        tipo_trabajador: this.nuevoUsuario.tipo_trabajador,
        nacionalidad: this.nuevoUsuario.nacionalidad,
        tipo_salario: this.nuevoUsuario.tipo_salario,
        numero_tipo_salario: this.nuevoUsuario.numero_tipo_salario
      }
    };

    // 3. Enviamos la petición POST al endpoint de usuarios
    this.http.post(`${environment.apiUrl}/usuarios`, payload, { headers })
      .subscribe({
        next: (res) => {
          alert('¡Personal y Usuario guardados con éxito!');
          this.cargarDatos();
          this.mostrarModal = false;
          this.limpiarFormulario();
        },
        error: (err) => {
          console.error('Error al guardar:', err);
          if (err.status === 401) {
            alert('Error: No autenticado. Por favor, inicia sesión de nuevo.'); //
          } else {
            alert('Error al guardar. Revisa la consola para más detalles.');
          }
        }
      });
  }

  limpiarFormulario() {
    this.nuevoUsuario = {
      name: '', email: '', password: '', categoria_id: '',
      nombre_completo: '', carnet_identidad: '', genero: 'Masculino',
      telefono: '', direccion: '', tipo_trabajador: '',
      nacionalidad: 'Boliviana', tipo_salario: '', numero_tipo_salario: ''
    };
  }
}