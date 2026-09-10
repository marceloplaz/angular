export interface AsistenciaRegistro {
  codigo_personal: number;
  id_interno: string;
  ci: string;
  celular: string;
  nombre_completo: string;
  fecha_asistencia: string;
  hora_ingreso: string | null;
  hora_salida: string | null;
  tipo_codigo: number | null;
  nombre_permiso: string | null;
  permiso_inicio: string | null;
  permiso_fin: string | null;
  duracion: number | null;
  gestiones: string | null;
  minutos_retraso: number;
  tiene_retraso: boolean;
}
export interface AsistenciaResponse {
  status: string;
  data: AsistenciaRegistro[];
}