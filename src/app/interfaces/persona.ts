export interface Persona {
  id?: number;
  nombre_completo: string; // Antes 'nombre'
  carnet_identidad: string; // Antes 'ci'
  fecha_nacimiento?: string; 
  genero: string;
  telefono: string;
  direccion: string;
  nacionalidad: string;

  // Campos necesarios para el registro de cuenta (Usuario)
  email?: string;    // Agregado para resolver error TS2339
  password?: string; // Agregado para resolver error TS2339

  tipo_trabajador: 'medico' | 'enfermera' | 'manual' | 'chofer' | 'administrativo' | string;
  cargo: string; 
  categoria?: string; // Agregado para compatibilidad con tu HTML
  
  tipo_salario: 'TGN' | 'SUS' | 'CONTRATO' | string;
  numero_tipo_salario: string;
  numero_item?: string; // Agregado para compatibilidad con tu HTML
  salario_monto: number;

  estado: boolean;
  user_id: number;

  created_at?: string;
  updated_at?: string;
}