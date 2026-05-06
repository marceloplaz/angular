// 1. Representa un turno individual dentro del calendario
export interface TurnoDetalle {
  id_asignacion: number;
  nombre_turno: string;
  horario: string;
  fecha: string;      
  color: string;
}

// 2. Representa a una persona (Enfermera/Médico) con sus turnos agrupados
export interface MiembroEquipo {
  usuario_id: number;
  usuario_nombre: string;
  categoria_nombre: string;
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
    };
}