export interface Incidencia {
  id?: number;
  usuario_id: number;
  servicio_id: number;
  fecha: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_proceso' | 'solucionado';
  observacion_tecnica?: string;
  fecha_solucion?: string;
  
  // ESTO ES LO QUE FALTA:
  // Definimos que puede venir un objeto 'servicio' (gracias al with de Laravel)
  servicio?: {
    id: number;
    nombre: string;
  };

  usuario_nombre?: string; 
  servicio_nombre?: string; 
}