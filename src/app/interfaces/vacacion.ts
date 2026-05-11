export interface Vacacion {
  id?: number;
  usuario_id: number;
  servicio_id: number;
  gestion_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  reemplazo?: string;
  motivo_tipo: string;
  motivo_detalle?: string;
  estado: number; // 0: Pendiente, 1: Aprobado, 2: Rechazado
  observaciones?: string;
  // Relaciones (opcionales al recibir datos del backend)
  user?: any;
  servicio?: any;
  persona?: any;
}