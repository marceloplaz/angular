export interface NovedadLaboral {
  id_origen: number;
  id_destino: number;
  tipo_novedad: 'permiso' | 'baja_medica' | 'vacacion' | 'licencia' | 'devolucion_turno';
  observacion?: string;
  con_devolucion?: boolean;
}

export interface NovedadListar {
  id: number;
  asignacion_id: number;
  tipo_novedad: string;
  usuario_solicitante_id: number;
  usuario_reemplazo_id: number;
  fecha_original: string;
  fecha_nueva: string;
  con_devolucion: number; 
  observacion_detalle: string;
  created_at: string;
  // Relaciones para mostrar nombres en lugar de IDs
asignacion?: { id: number; servicio?: { id: number; nombre: string; };// declaramos el nombre del servicio
    turno?: {nombre: string; hora_inicio: string;hora_fin: string;}; // el tipo de turno y horas  "Mañana"
  };

  
  solicitante?: {  id: number;
    persona: { nombre_completo: string; };
  };
  reemplazo?: { id: number;
    persona: { nombre_completo: string; };
};
}
