import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS } from '../constants/pdf-colors'; // Asegúrate de que la ruta sea correcta

@Injectable({
  providedIn: 'root'
})
export class ReporteMensualService {
  private solicitarDatosSource = new Subject<void>();
  solicitarDatos$ = this.solicitarDatosSource.asObservable();

  private enviarDatosSource = new Subject<any>();
  enviarDatos$ = this.enviarDatosSource.asObservable();

  constructor() {
    this.enviarDatos$.subscribe(datos => {
        console.log('📥 DATOS RECIBIDOS EN EL SERVICIO:', datos);
      this.generarCalendarioMensualPDF(datos);
    });
  }

  solicitarReporteActual(): void {
    this.solicitarDatosSource.next();
  }

  enviarDatosParaPDF(datos: any): void {
    this.enviarDatosSource.next(datos);
  }

  private generarCalendarioMensualPDF(reporte: any): void {
    const doc = new jsPDF('l', 'mm', 'a4');
    const { filtros, contenido } = reporte;

    // 1. Configuración de Fecha (Usando mes_id - 96 para obtener el número real de mes)
const año = filtros.gestion; 
const numeroMes = filtros.mes_id - 96; // 97 - 96 = 1 (Enero), 101 - 96 = 5 (Mayo)
const mesIndex = numeroMes - 1; 

const diasEnMes = new Date(año, mesIndex + 1, 0).getDate();
const primerDiaDelaSemana = new Date(año, mesIndex, 1).getDay();
// Ajuste para que la semana empiece en Lunes
const desplazamiento = primerDiaDelaSemana === 0 ? 6 : primerDiaDelaSemana - 1;

    // 2. Encabezado Institucional
    doc.setFillColor(...PDF_COLORS['VERDE_HOSPITAL']);
    doc.rect(0, 0, 297, 35, 'F');

    doc.setFontSize(20);
    doc.setTextColor(...PDF_COLORS['BLANCO']);
    doc.text('HOSPITAL SAN JUAN DE DIOS', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`ROL MENSUAL DE TURNOS - ${filtros.servicio}`, 14, 22);
    doc.text(`Mes: ${filtros.mes} | Gestión: ${filtros.gestion} | Categoría: ${filtros.categoria}`, 14, 28);

    
    const filasCalendario = [];
    let semana: any[] = Array(7).fill("");

    for (let i = 1; i <= 42; i++) {
      const diaActual = i - desplazamiento;
      const indexColumna = (i - 1) % 7;

      if (diaActual > 0 && diaActual <= diasEnMes) {
        // Generar llave de búsqueda YYYY-MM-DD
        const mesStr = String(numeroMes).padStart(2, '0');
        const diaStr = String(diaActual).padStart(2, '0');
      const fechaKey = `${año}-${mesStr}-${diaStr}`;
        
        if (contenido[fechaKey]) {
    console.log(`✅ Turnos encontrados para el día ${fechaKey}:`, contenido[fechaKey]);
} else {
    // Esto te avisará si el calendario busca una fecha que no existe en tus datos
    console.warn(`❓ No hay datos para la fecha: ${fechaKey}`);
}
        // Buscamos los turnos en el objeto 'contenido' enviado desde el componente
        const turnos = contenido[fechaKey] || [];
        
                   const textoTurnos = turnos.map((t: any) => {
    // Usamos las propiedades exactas que definimos en el componente
    const nombre = t.usuario || 'PERSONAL';
    const area = t.area || 'GENERAL';
    const tipo = t.turno || 'S/T';
    const horario = `(${t.inicio} - ${t.fin})`;

    // Formato: • Turno | Área
    //          Nombre
    //          (Horas)
    return `• ${tipo} | ${area}\n  ${nombre}\n  ${horario}`;
                                                        }).join('\n──────────\n');

        semana[indexColumna] = {
    content: `${diaActual}\n\n${textoTurnos}`,
    styles: {
        fillColor: diaActual % 2 === 0 ? PDF_COLORS['FONDO_MENTA'] : [255, 255, 255],
        textColor: PDF_COLORS['VERDE_OSCURO'],
        fontSize: 6, // Reducimos un poco el tamaño para que quepa el nombre largo
        minCellHeight: 38, // Aumentamos un poco el alto para dar espacio al área
        valign: 'top'
          }
        };
      }

      if (indexColumna === 6) {
        filasCalendario.push([...semana]);
        semana.fill("");
        if (diaActual >= diasEnMes) break;
      }
    }

    // 4. Renderizado de la Tabla
    autoTable(doc, {
      startY: 40,
      head: [['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']],
      body: filasCalendario,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS['VERDE_OSCURO'],
        textColor: PDF_COLORS['BLANCO'],
        halign: 'center'
      },
      styles: {
        lineWidth: 0.1,
        lineColor: PDF_COLORS['VERDE_HOSPITAL']
      }
    });

    const nombreArchivo = `Rol_${filtros.servicio.replace(/\s+/g, '_')}_${filtros.mes}_${año}.pdf`;
    doc.save(nombreArchivo);
  }
}