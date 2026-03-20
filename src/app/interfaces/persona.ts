export interface Persona {
    id?: number;
    nombre_completo: string;
    carnet_identidad: string;
    genero: string;
    telefono: string;
    direccion: string;
    tipo_trabajador?: string;
    nacionalidad?: string;
    tipo_salario?: string;
    numero_tipo_salario?: string;
}

// NUEVA INTERFAZ PARA EL REGISTRO MAESTRO
export interface RegistroMaestro {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    categoria_id: number;
    roles: number[];
    persona: Persona; // Aquí incluimos la interfaz anterior
}