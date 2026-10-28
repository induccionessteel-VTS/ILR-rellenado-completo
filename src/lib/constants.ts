import { CoordinateConfig, MedicalQuestion, NormaSeguridadItem } from './types';

export const STATIC_VALUES = {
  fecha: '27-10-2026',
  cargoPage1: 'OPERARIO(A) DE ASEO',
  area: 'CONCENTRADUCTO',
  horaInicio: '10:00',
  horaTermino: '12:00',
  cargoPage22: 'Operario de Aseo',
  codigoDocumento: 'VELTS-D-ACN212-HS-0012',
  empresa: 'Steel Ingeniería S.A.',
};

/**
 * Preguntas Médicas mapeadas exactamente a las filas y columnas de la
 * Ficha Médica del Trabajador en el documento real VELTS-D-ACN212-HS-0012:
 * - Página 8 (Índice 7): Enfermedades 01 a 04
 * - Página 9 (Índice 8): Enfermedades 05 a 08, Antecedentes Generales y Otras Consideraciones
 */
export const MEDICAL_QUESTIONS: MedicalQuestion[] = [
  // PÁGINA 8 (ÍNDICE 7) - ENFERMEDADES (Tabla 1)
  {
    id: 'enf_epilepsia',
    category: 'enfermedades',
    pageIndex: 7,
    question: '01. Epilepsia o convulsiones',
    coordsYes: { x: 373, y: 131 },
    coordsNo: { x: 403, y: 131 },
  },
  {
    id: 'enf_lumbago',
    category: 'enfermedades',
    pageIndex: 7,
    question: '02. Lumbago o dolor crónico de columna',
    coordsYes: { x: 373, y: 114 },
    coordsNo: { x: 403, y: 114 },
  },
  {
    id: 'enf_hipertension',
    category: 'enfermedades',
    pageIndex: 7,
    question: '03. Hipertensión Arterial',
    coordsYes: { x: 373, y: 96 },
    coordsNo: { x: 403, y: 96 },
  },
  {
    id: 'enf_diabetes',
    category: 'enfermedades',
    pageIndex: 7,
    question: '04. Diabetes (Tipo 1 o 2)',
    coordsYes: { x: 373, y: 79 },
    coordsNo: { x: 403, y: 79 },
  },

  // PÁGINA 9 (ÍNDICE 8) - ENFERMEDADES (Continuación)
  {
    id: 'enf_asma',
    category: 'enfermedades',
    pageIndex: 8,
    question: '05. Asma bronquial o dificultad respiratoria',
    coordsYes: { x: 373, y: 646 },
    coordsNo: { x: 403, y: 646 },
  },
  {
    id: 'enf_claustrofobia',
    category: 'enfermedades',
    pageIndex: 8,
    question: '06. Claustrofobia o fobia a espacios cerrados',
    coordsYes: { x: 373, y: 628 },
    coordsNo: { x: 403, y: 628 },
  },
  {
    id: 'enf_inmuno',
    category: 'enfermedades',
    pageIndex: 8,
    question: '07. Enfermedad inmunodepresora (Lupus, VIH, Cáncer)',
    coordsYes: { x: 373, y: 608 },
    coordsNo: { x: 403, y: 608 },
  },
  {
    id: 'enf_otras',
    category: 'enfermedades',
    pageIndex: 8,
    question: '08. Otras enfermedades de relevancia',
    coordsYes: { x: 373, y: 586 },
    coordsNo: { x: 403, y: 586 },
  },

  // PÁGINA 9 (ÍNDICE 8) - ANTECEDENTES GENERALES
  {
    id: 'ant_fractura',
    category: 'antecedentes',
    pageIndex: 8,
    question: '08. Fractura / Esguince / TEC (Traumatismo Encéfalo Craneal)',
    coordsYes: { x: 373, y: 506 },
    coordsNo: { x: 403, y: 506 },
  },
  {
    id: 'ant_tratamientos',
    category: 'antecedentes',
    pageIndex: 8,
    question: '09. Tratamientos Médicos vigentes o prolongados',
    coordsYes: { x: 373, y: 483 },
    coordsNo: { x: 403, y: 483 },
  },

  // PÁGINA 9 (ÍNDICE 8) - OTRAS CONSIDERACIONES
  {
    id: 'cons_alergia',
    category: 'consideraciones',
    pageIndex: 8,
    question: '11. Alergia grave a medicamentos, polvo o químicos',
    coordsYes: { x: 367, y: 386 },
    coordsNo: { x: 395, y: 386 },
  },
  {
    id: 'cons_protesis',
    category: 'consideraciones',
    pageIndex: 8,
    question: '12. Prótesis médica',
    coordsYes: { x: 367, y: 364 },
    coordsNo: { x: 395, y: 364 },
  },
  {
    id: 'cons_ortesis',
    category: 'consideraciones',
    pageIndex: 8,
    question: '13. Órtesis (apoyo externo al cuerpo)',
    coordsYes: { x: 367, y: 341 },
    coordsNo: { x: 395, y: 341 },
  },
  {
    id: 'cons_discapacidad',
    category: 'consideraciones',
    pageIndex: 8,
    question: '14. Discapacidad acreditada',
    coordsYes: { x: 367, y: 318 },
    coordsNo: { x: 395, y: 318 },
  },
  {
    id: 'cons_otras',
    category: 'consideraciones',
    pageIndex: 8,
    question: '15. Otras consideraciones médicas especiales',
    coordsYes: { x: 367, y: 296 },
    coordsNo: { x: 395, y: 296 },
  },
];

/**
 * 13 Módulos de Normas Generales de Seguridad DS 44 que deben marcarse con una 'X'
 * en sus casillas de verificación en las páginas 10, 11 y 12 del documento real:
 */
export const NORMAS_SEGURIDAD_ITEMS: NormaSeguridadItem[] = [
  // PÁGINA 10 (ÍNDICE 9)
  {
    id: 'norma_01',
    itemNum: 1,
    title: '1.- Ley 16.744 de Accidentes del Trabajo y Enfermedades Profesionales',
    pageIndex: 9,
    coord: { x: 58, y: 590 },
  },
  {
    id: 'norma_02',
    itemNum: 2,
    title: '2.- Riesgos del Manejo Manual de Materiales (Ley 20.001 y D.S. 63)',
    pageIndex: 9,
    coord: { x: 58, y: 432 },
  },
  {
    id: 'norma_03',
    itemNum: 3,
    title: '3.- Control de Emergencias, Incendios, Extintores y Primeros Auxilios',
    pageIndex: 9,
    coord: { x: 58, y: 352 },
  },
  {
    id: 'norma_04',
    itemNum: 4,
    title: '4.- Res. Exenta 156 SUSESO (Accidentes Graves y Fatales)',
    pageIndex: 9,
    coord: { x: 58, y: 238 },
  },

  // PÁGINA 11 (ÍNDICE 10)
  {
    id: 'norma_05',
    itemNum: 5,
    title: '5.- Elementos de Protección Personal (EPP), manejo correcto y obligatoriedad',
    pageIndex: 10,
    coord: { x: 58, y: 644 },
  },
  {
    id: 'norma_06',
    itemNum: 6,
    title: '6.- Posición Ergonómica en las estaciones de trabajo',
    pageIndex: 10,
    coord: { x: 58, y: 563 },
  },
  {
    id: 'norma_07',
    itemNum: 7,
    title: '7.- Capacitación teórica sobre uso y manejo de extintores (PQS y CO2)',
    pageIndex: 10,
    coord: { x: 58, y: 472 },
  },
  {
    id: 'norma_08',
    itemNum: 8,
    title: '8.- Señalizaciones de Seguridad (Normativa y códigos de color)',
    pageIndex: 10,
    coord: { x: 58, y: 402 },
  },
  {
    id: 'norma_09',
    itemNum: 9,
    title: '9.- Análisis de Riesgos en el Trabajo (AST / ART obligatorio)',
    pageIndex: 10,
    coord: { x: 58, y: 238 },
  },

  // PÁGINA 12 (ÍNDICE 11)
  {
    id: 'norma_10',
    itemNum: 10,
    title: '10.- Procedimientos Seguros de Trabajo (PST) en tareas de criticidad',
    pageIndex: 11,
    coord: { x: 58, y: 644 },
  },
  {
    id: 'norma_11',
    itemNum: 11,
    title: '11.- Sistema de Bloqueo y Etiquetado (LOTO 7 Pasos)',
    pageIndex: 11,
    coord: { x: 58, y: 552 },
  },
  {
    id: 'norma_12',
    itemNum: 12,
    title: '12.- Protocolos del Ministerio de Salud (PREXOR, PLANESI, TMERT, MMC, UV)',
    pageIndex: 11,
    coord: { x: 58, y: 483 },
  },
  {
    id: 'norma_13',
    itemNum: 13,
    title: '13.- Sustancias Químicas Peligrosas y Hojas de Datos de Seguridad (D.S. 57)',
    pageIndex: 11,
    coord: { x: 58, y: 402 },
  },
];

/**
 * Coordenadas exactamente calibradas para el documento real:
 * - Acta DS 44: VELTS-D-ACN212-HS-0012 (612 x 792 pt - US Letter)
 * - Consentimiento: CEN-RG-GSS-SGR-004 (595.32 x 841.92 pt - A4)
 */
export const DEFAULT_COORDINATES: CoordinateConfig = {
  actaDs44: {
    page1: {
      nombre: { x: 160, y: 557 },
      rut: { x: 460, y: 557 },
      cargo: { x: 87, y: 542 },
      fecha: { x: 432, y: 542 },
      area: { x: 84, y: 528 },
      horaInicio: { x: 440, y: 515 }, // Mover a la izquierda debajo del título
      horaTermino: { x: 525, y: 515 }, // Mover a la izquierda debajo del título
      contactoEmergencia: { x: 230, y: 505 }, // Desplazado a la derecha para no tocar títulos
      telefonoEmergencia: { x: 230, y: 492 },
      personaNuevaX: { x: 200, y: 464, size: 16 }, // 'X' negra centrada en la casilla blanca (desplazada a la izquierda)
    },
    page22: {
      parrafoSuperior: {
        nombre: { x: 160, y: 426 },
        rut: { x: 95, y: 410 },
        cargo: { x: 68, y: 395 },
      },
      recuadroInferior: {
        firma: { x: 350, y: 105, width: 170, height: 75 },
        nombre: { x: 320, y: 85 },
        rut: { x: 320, y: 73 },
      },
      nombre: { x: 320, y: 85 }, // Dentro del recuadro principal justo debajo de la firma (size: 9)
      rut: { x: 320, y: 73 },
      cargo: { x: 68, y: 395 },
      firma: { x: 350, y: 105, width: 170, height: 75 }, // Lado derecho, respetando recuadro Huella
    },
    normasSeguridad: {
      norma_01: { x: 58, y: 590 },
      norma_02: { x: 58, y: 432 },
      norma_03: { x: 58, y: 352 },
      norma_04: { x: 58, y: 238 },
      norma_05: { x: 58, y: 644 },
      norma_06: { x: 58, y: 563 },
      norma_07: { x: 58, y: 472 },
      norma_08: { x: 58, y: 402 },
      norma_09: { x: 58, y: 238 },
      norma_10: { x: 58, y: 644 },
      norma_11: { x: 58, y: 552 },
      norma_12: { x: 58, y: 483 },
      norma_13: { x: 58, y: 402 },
    },
  },
  consentimiento: {
    nombreParrafo: { x: 105, y: 446 },
    rutParrafo: { x: 95, y: 432 },
    nombre: { x: 220, y: 304 },
    rut: { x: 155, y: 280 },
    fecha: { x: 165, y: 256 },
    firma: { x: 175, y: 195, width: 145, height: 50 },
  },
};

export function formatRUT(rutRaw: string): string {
  const clean = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!clean) return '';
  if (clean.length === 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

export function validateRUT(rutFormatted: string): boolean {
  const clean = rutFormatted.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 8) return false;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNum = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvNum === 11) expectedDv = '0';
  else if (expectedDvNum === 10) expectedDv = 'K';
  else expectedDv = expectedDvNum.toString();

  return dv === expectedDv;
}
