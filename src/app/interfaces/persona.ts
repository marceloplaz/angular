export interface Persona {
  id?: number;
  nombre_completo: string;
  carnet_identidad: string;
  fecha_nacimiento?: string; 
  genero: string;
  telefono: string;
  direccion: string;
  nacionalidad: string;

  // Ampliamos para evitar errores de coincidencia con la DB
  tipo_trabajador: 'medico' | 'enfermera' | 'manual' | 'chofer' | 'administrativo' | string;
  cargo: string; 
  
  // Agregamos 'SUS' que mencionaste ahora
  tipo_salario: 'TGN' | 'SUS' | 'CONTRATO' | string;
  numero_tipo_salario: string;
  salario_monto: number;

  estado: boolean;
  user_id: number;

  created_at?: string;
  updated_at?: string;
}