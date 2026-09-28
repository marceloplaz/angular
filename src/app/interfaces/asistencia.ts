export interface TurnoProgramadoInfo {
  nombre: string;
  servicio: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}

// TU INTERFAZ ORIGINAL (Sin cambiar ningún nombre)
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
  salida_temprana: boolean;    
  minutos_temprano: number;    
  estado_texto?: string;
  turno_programado?: TurnoProgramadoInfo;
}

// ESTRUCTURA PARA LA PLANILLA EXCEL (Reutilizando tus nombres + campos del R.I.P.)
export interface EmpleadoPlanilla {
  item: string;
  carga_horaria: string;
  fecha_ingreso: string;
  ci: string;
  cargo: string;
  lugar_trabajo: string;
  
  // Apellidos y Nombres (puedes usar nombre_completo o el desglose)
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  nombre_completo?: string; 

  // Sanciones R.I.P. (usando tu propiedad minutos_retraso)
  faltas: number;
  minutos_retraso: number; // Mantenemos tu nombre exacto "minutos_retraso"
  abandono: number;
  omision_marcado: number;
  total_dias_descontar: number;

  // Novedades Laborales
  dias_efect_trabajados: number;
  dias_falta: number;
  dias_baja_medica: number;
  dias_licencia: number;
  dias_vacacion: number;
  dias_comision: number;
  dias_feriado: number;
  dias_fin_semana: number;
  total_dias_mes: number;

  observacion: string;
  dias_detalle?: { [fecha: string]: AsistenciaRegistro };
}

export interface RespuestaPlanilla {
  status: string;
  data: {
    fecha_inicio: string;
    fecha_fin: string;
    nombre_categoria: string;
    fechas_rango: string[];
    empleados: EmpleadoPlanilla[];
  };
}