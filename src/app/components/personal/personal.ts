import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // 1. Importa esto
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // 2. Agrégalo aquí
  templateUrl: './personal.html'
})

export class PersonalComponent implements OnInit {
  private http = inject(HttpClient);

  // Inicializamos como arreglo vacío para evitar errores de renderizado
  public listaPersonas: any[] = []; 

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    // Es importante que la URL coincida con tu ruta pública de Laravel
    this.http.get('http://localhost:8000/api/v1/usuarios').subscribe({
      next: (res: any) => {
        // Como el JSON que me pasaste es un Array directo [], lo asignamos así:
        this.listaPersonas = Array.isArray(res) ? res : (res.data || []);
        console.log('Personal cargado con éxito:', this.listaPersonas);
      },
      error: (err) => {
        console.error('Error al conectar con el backend de jugadordeunbit:', err);
      }
    });
  }
public nuevoUsuario: any = {
  name: '',
  email: '',
  password: '',
  categoria_id: '',
  // Campos de Persona
  nombre_completo: '',
  carnet_identidad: '',
  genero: '',
  telefono: '',
  direccion: '',
  tipo_trabajador: '',
  nacionalidad: 'Boliviana',
  tipo_salario: '',
  numero_tipo_salario: ''
};
public mostrarModal = false;

guardarUsuario() {
  const token = localStorage.getItem('token'); //
  const headers = { 'Authorization': `Bearer ${token}` };

  this.http.post('http://localhost:8000/api/v1/usuarios', this.nuevoUsuario, { headers })
    .subscribe({
      next: (res) => {
        this.cargarDatos(); // Recargamos la tabla
        this.mostrarModal = false;
        alert('Usuario creado con éxito');
      },
      error: (err) => console.error('Error al crear:', err)
    });
}
}