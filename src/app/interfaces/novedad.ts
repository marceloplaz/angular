export interface NovedadLaboral {
  id_origen: number;
  id_destino: number;
  tipo_novedad: 'permiso' | 'baja_medica' | 'vacacion' | 'licencia' | 'devolucion_turno';
  observacion?: string;
  con_devolucion?: boolean;
}