

export interface CrearTurnoRequest {
  nombre_turno: string;
  hora_inicio: string;
  hora_fin: string;
  categoria_id: number;
  duracion_horas: number;
}

// 1. Interfaz para lo que el formulario muestra y maneja
export interface AreaForm {
  nombre: string;
  servicio_id: number | null;
  categoria_id: number | null;
}

// 2. Interfaz para lo que el backend espera (CrearAreaRequest)
// Esta es más estricta porque el servidor NO acepta nulos
export interface CrearAreaRequest {
  nombre: string;
  servicio_id: number;
  categoria_id: number;
}

// 3. Interfaz para cuando recibes datos del backend (GET)
// Esta suele incluir el ID y a veces la relación con la categoría
export interface AreaDetalle {
  id: number;
  nombre: string;
  servicio_id: number;
  categoria_id: number;
  categoria?: {
    id: number;
    nombre: string;
  };
}