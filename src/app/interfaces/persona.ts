export interface Persona {
  id?: number;
  nombre_completo: string;
  carnet_identidad: string;
  fecha_nacimiento?: string; 
  genero: string;
  telefono: string;
  direccion: string;
  nacionalidad: string;

  // Estos son los campos que causan el error
  tipo_trabajador: 'medico' | 'enfermera' | 'manual' | 'chofer' | 'administrativo';
  cargo: string; 
  
  tipo_salario: 'TGN' | 'SUS' | 'CONTRATO';
  numero_tipo_salario: string;
  salario_monto: number;

  estado: boolean;
  user_id: number;

  created_at?: string;
  updated_at?: string;
}