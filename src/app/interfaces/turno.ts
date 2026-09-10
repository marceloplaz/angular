import { Comida } from './comida';

export interface TurnoDetalle {
  id_asignacion: number;
  nombre_turno: string;
  horario: string;
  fecha: string;      
  color: string;
  duracion_horas?: number;
  termina_dia_siguiente?: boolean; // Vienen desde el backend si cruza de día
  comidas?: Comida[];
  
  // Propiedades dinámicas para el control de la grilla en Frontend
  esPosguardia?: boolean;          // Indica si el día fue bloqueado por un turno del día anterior
  turnoOrigenFecha?: string;       // Guarda la fecha del turno que generó esta posguardia
}

// 2. Representa a una persona (Enfermera/Médico/manual) con sus turnos agrupados
export interface MiembroEquipo {
  usuario_id: number;
  usuario_nombre: string;
  categoria_nombre: string;
  tipo_salario: string;
  turnos: TurnoDetalle[];
  
}

//  Estructura de la respuesta completa del servidor si 
export interface ApiResponseTurnos {
  status: string;
  equipo_visible: MiembroEquipo[]; // Cambiar 'data' por 'equipo_visible'
}
export interface TurnoAsignado {
    fecha: string;
    turno: {
        nombre_turno: string;
        hora_inicio: string;
        hora_fin: string;
    };
    area: {
        nombre: string;
        comidas?: Comida[];
    };
    
}