export interface TurnoProgramadoInfo {
  nombre: string;
  servicio: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export interface AsistenciaRegistro {
  codigo_personal: number | string;
  id_interno: string;
  ci: string;
  celular: string;
  nombre_completo: string;
  fecha_asistencia: string;
  hora_ingreso: string | null;
  hora_salida: string | null;
  tipo_codigo?: string | null;
  nombre_permiso?: string | null;
  permiso_inicio?: string | null;
  permiso_fin?: string | null;
  duracion?: number | null;
  gestiones?: string | null;
  minutos_retraso: number;
  tiene_retraso: boolean;
  
  // Agregar la nueva propiedad aquí (opcional o requerida según tu flujo)
  turno_programado?: TurnoProgramadoInfo; 
}