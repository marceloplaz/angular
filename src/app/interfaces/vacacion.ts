export interface Vacacion {
id?: number;
  usuario_id: number;
  servicio_id: number;
  gestion_id: number;
  categoria_id: number;
  nombre_completo: string;
  // Estructura anidada que viene en tu JSON
  tipo: 'INGRESO' | 'SALIDA';

  cas_calificacion: number; // El extra por antigüedad
  dias_derecho: number;      // Los 15, 20 o 30 días base
  gestiones_cumplidas: string; // Ejemplo: "2023-2024"

  gestion?: {
    id: number;
    año: string | number; // Cambiado de 'nombre' a 'año'
    activo: number;
  };

  user?: {
    id: number;
    name: string;
    email: string;
    persona?: {
      id: number;
      nombre_completo: string;
      tipo_trabajador: string;
      fecha_ingreso_institucion?: string;
    }
  };
  
  // Fechas y Periodos
  fecha_ingreso_institucion: string;
  periodo_desde: string;
  periodo_hasta: string;
  fecha_inicio: string;
  fecha_fin: string;
  
  // Contadores de días
  total_dias_derecho: number;
  dias_consumidos: number;
  saldo_restante: number;
  dias_solicitados: number;

  
  /** 1: Activo, 0: Inactivo */
  permiso_cuenta: 0 | 1; 
  
  /** 0: Sin asignar, 1: Asignado, 2: Rechazado */
  estado: 0 | 1 | 2; 

  motivo_tipo: 'VACACION_PROGRAMADA' | 'SALUD' | 'TRAMITE' | 'FAMILIAR' | 'PARTICULAR' | 'OTRO';
  motivo_detalle?: string;
  
  aprobado_por?: string;
  observaciones?: string;
  created_at: string;
  
  // Auxiliares para UI
  servicio_nombre?: string;
  gestion_año?: number;
  categoria_nombre?: string;

}