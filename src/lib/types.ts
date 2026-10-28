/**
 * Tipos de datos para el sistema de llenado y firma de documentos legales
 * DS 44 (Acta IRL) y Consentimiento de Alcohol y Drogas
 */

export interface MedicalQuestion {
  id: string;
  category: 'enfermedades' | 'antecedentes' | 'consideraciones';
  pageIndex: number; // 7 to 11 (corresponde a páginas 8 al 12)
  question: string;
  coordsYes: { x: number; y: number };
  coordsNo: { x: number; y: number };
}

export interface NormaSeguridadItem {
  id: string;
  itemNum: number;
  title: string;
  pageIndex: number; // 9 for p10, 10 for p11, 11 for p12
  coord: { x: number; y: number };
}

export interface WorkerFormData {
  // Datos dinámicos del trabajador
  nombre: string;
  rut: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;

  // Datos estáticos requeridos DS 44 (Page 1)
  cargo: string;
  fecha: string;
  area: string;
  horaInicio: string;
  horaTermino: string;
  esPersonaNueva: boolean;

  // Cuestionario médico (SI / NO)
  respuestasMedicas: Record<string, boolean>; // id -> true (SI) / false (NO)

  // Firma en formato data URL PNG (base64)
  firmaPngBase64: string;
}

export interface CoordinateConfig {
  actaDs44: {
    page1: {
      cargo: { x: number; y: number };
      fecha: { x: number; y: number };
      area: { x: number; y: number };
      horaInicio: { x: number; y: number };
      horaTermino: { x: number; y: number };
      personaNuevaX: { x: number; y: number; size: number };
      nombre: { x: number; y: number };
      rut: { x: number; y: number };
      contactoEmergencia: { x: number; y: number };
      telefonoEmergencia: { x: number; y: number };
    };
    page22: {
      parrafoSuperior?: {
        nombre: { x: number; y: number };
        rut: { x: number; y: number };
        cargo: { x: number; y: number };
      };
      recuadroInferior?: {
        firma: { x: number; y: number; width: number; height: number };
        nombre: { x: number; y: number };
        rut: { x: number; y: number };
      };
      nombre: { x: number; y: number };
      rut: { x: number; y: number };
      cargo: { x: number; y: number };
      firma: { x: number; y: number; width: number; height: number };
    };
    normasSeguridad: Record<string, { x: number; y: number }>;
  };
  consentimiento: {
    nombreParrafo: { x: number; y: number };
    rutParrafo: { x: number; y: number };
    nombre: { x: number; y: number };
    rut: { x: number; y: number };
    fecha: { x: number; y: number };
    firma: { x: number; y: number; width: number; height: number };
  };
}

export interface AuditoriaDocumento {
  id?: string;
  created_at?: string;
  nombre_trabajador: string;
  rut: string;
  cargo?: string;
  area?: string;
  documentos_generados: string[];
  ip_address: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedDocumentsResult {
  ds44BlobUrl: string;
  ds44Size: number;
  consentimientoBlobUrl: string;
  consentimientoSize: number;
  mergedBlobUrl: string;
  mergedSize: number;
  ds44Bytes: Uint8Array;
  consentimientoBytes: Uint8Array;
  mergedBytes: Uint8Array;
}
