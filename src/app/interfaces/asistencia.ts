export interface TurnoProgramadoInfo {
  nombre: string;
  servicio: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export interface AsistenciaRegistro {
  codigo_personal?: string;
  id_interno?: number | string;
  ci?: string;
  celular?: string;
  nombre_completo?: string;
  fecha_asistencia?: string;
  hora_ingreso?: string | null;
  hora_salida?: string | null;
  tipo_codigo?: string;
  nombre_permiso?: string;
  permiso_inicio?: string;
  permiso_fin?: string;
  duracion?: number;
  gestiones?: string;
  minutos_retraso: number;
  tiene_retraso: boolean;
  salida_temprana: boolean;    // <-- Agregar esta propiedad
  minutos_temprano: number;    // <-- Agregar esta propiedad
  estado_texto?: string;
  turno_programado?: {
    nombre?: string;
    servicio?: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  };
}