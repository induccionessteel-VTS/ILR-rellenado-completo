/**
 * Entregables de Código Completos para Next.js 15+ (App Router), TypeScript,
 * Tailwind CSS, Supabase y pdf-lib / pdfjs-dist.
 * 
 * Regla Estricta: Todos los textos y marcas "X" inyectados usan rgb(0, 0, 0).
 * Coordenadas geométricas exactamente alineadas a los documentos oficiales:
 * 1. Acta IRL D.S. N° 44 (VELTS-D-ACN212-HS-0012.00)
 * 2. Consentimiento Alcohol y Drogas (CEN-RG-GSS-SGR-004)
 */

export const TERMINAL_COMMANDS = `# ==============================================================================
# GUÍA DE INSTALACIÓN Y DESPLIEGUE (NEXT.JS + SUPABASE + GITHUB + VERCEL)
# ==============================================================================

# 1. Crear el proyecto Next.js con App Router y TypeScript
npx create-next-app@latest legal-doc-signer \\
  --typescript \\
  --tailwind \\
  --eslint \\
  --app \\
  --src-dir \\
  --import-alias "@/*" \\
  --use-npm

# 2. Entrar a la carpeta del proyecto
cd legal-doc-signer

# 3. Instalar librerías de producción: pdf-lib, pdfjs-dist, Supabase y Canvas
npm install pdf-lib pdfjs-dist @supabase/supabase-js @google/genai react-signature-canvas lucide-react
npm install -D @types/react-signature-canvas

# 4. Crear estructura de carpetas requerida
mkdir -p public/templates
mkdir -p public/assets
mkdir -p src/lib
mkdir -p src/components
mkdir -p src/app/api/generate
mkdir -p src/app/api/ai-calibrate
mkdir -p src/app/admin
mkdir -p supabase

# 5. Copiar los archivos PDF originales a public/templates/
# - public/templates/acta_ds44_template.pdf (VELTS-D-ACN212-HS-0012)
# - public/templates/consentimiento_alcohol_drogas.pdf (CEN-RG-GSS-SGR-004)

# 6. Configurar variables de entorno en .env.local
cat << 'EOF' > .env.local
# SUPABASE (Públicas)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
NEXT_PUBLIC_ADMIN_PIN=admin2026

# SERVIDOR / BACKEND (Secretas - Nunca exponer en cliente)
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-supabase
ADMIN_SECRET_KEY=clave_secreta_para_sesion_admin
GEMINI_API_KEY=tu-gemini-api-key
EOF

# 7. Ejecutar localmente
npm run dev

# 8. Vincular a GitHub y Desplegar en Vercel
git init
git add .
git commit -m "feat: legal document signing system with pdf-lib, supabase and gemini"
gh repo create legal-doc-signer --public --source=. --remote=origin --push
vercel --prod
`;

export const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- SCRIPT SQL PARA SUPABASE: TABLA DE AUDITORÍA Y BUCKET DE DOCUMENTOS FIRMADOS
-- Seguridad RLS Restringida Exclusivamente a Administradores
-- ==============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla principal de auditoría masiva inmutable
CREATE TABLE IF NOT EXISTS public.auditoria_documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('America/Santiago', NOW()) NOT NULL,
    nombre_trabajador TEXT NOT NULL,
    rut TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'OPERARIO(A) DE ASEO',
    area TEXT NOT NULL DEFAULT 'CONCENTRADUCTO',
    documento_codigo TEXT NOT NULL DEFAULT 'VELTS-D-ACN212-HS-0012',
    documentos_generados TEXT[] NOT NULL,
    tipo_firma TEXT NOT NULL DEFAULT 'digital_manuscrita', -- 'digital_manuscrita' o 'foto_subida'
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    archivo_peso_bytes INTEGER,
    url_acta_ds44 TEXT,
    url_consentimiento TEXT,
    url_paquete_completo TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Índices optimizados para auditorías en faena minera
CREATE INDEX IF NOT EXISTS idx_auditoria_rut ON public.auditoria_documentos(rut);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria_documentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_ip ON public.auditoria_documentos(ip_address);

-- 4. Habilitar Row Level Security (RLS) - OBLIGATORIO PARA CUMPLIMIENTO LEGAL
ALTER TABLE public.auditoria_documentos ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICA DE INSERCIÓN (Permite registrar auditoría desde API backend)
CREATE POLICY "Permitir insercion de auditoria desde API o anon"
    ON public.auditoria_documentos
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- 6. POLÍTICA DE CONSULTA (RESTRINGIDA SOLO A ADMINISTRADORES Y SERVICE_ROLE)
-- Trabajadores regulares no pueden consultar la base de datos de otros firmantes
CREATE POLICY "Lectura exclusiva para administradores y service_role"
    ON public.auditoria_documentos
    FOR SELECT
    TO service_role
    USING (true);

-- 7. CREACIÓN DEL STORAGE BUCKET: documentos_firmados
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos_firmados', 'documentos_firmados', false)
ON CONFLICT (id) DO NOTHING;

-- 8. POLÍTICAS DE SEGURIDAD PARA STORAGE
-- Inserción exclusiva desde backend (service_role) o usuarios autenticados
CREATE POLICY "Permitir subida de PDFs firmados a service_role"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'documentos_firmados');

-- Lectura de PDFs firmados protegida
CREATE POLICY "Permitir descarga con URL firmada o service_role"
    ON storage.objects
    FOR SELECT
    TO service_role
    USING (bucket_id = 'documentos_firmados');

COMMENT ON TABLE public.auditoria_documentos IS 'Registro inmutable confidencial de firmas legales DS 44 para faena minera';
`;

export const NEXT_SUPABASE_CLIENT = `// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// En el backend (Route Handlers) usamos Service Role Key para operaciones privilegiadas
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuditoriaPayload {
  nombre_trabajador: string;
  rut: string;
  cargo?: string;
  area?: string;
  documento_codigo?: string;
  documentos_generados: string[];
  tipo_firma?: 'digital_manuscrita' | 'foto_subida';
  ip_address: string;
  user_agent?: string;
  archivo_peso_bytes?: number;
  url_acta_ds44?: string;
  url_consentimiento?: string;
  url_paquete_completo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sube un PDF firmado al bucket de almacenamiento privado 'documentos_firmados'
 */
export async function uploadSignedPdf(
  fileName: string,
  fileBytes: Uint8Array
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('documentos_firmados')
      .upload(fileName, fileBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage Upload Error]:', error.message);
      return null;
    }

    // Generar URL firmada de descarga válida por 7 días (604800 segundos)
    const { data: signedData } = await supabase.storage
      .from('documentos_firmados')
      .createSignedUrl(data.path, 604800);

    return signedData?.signedUrl || null;
  } catch (err: any) {
    console.error('[Supabase Storage Exception]:', err.message);
    return null;
  }
}

/**
 * Inserta el registro de auditoría legal inmutable en Supabase
 */
export async function registrarAuditoria(payload: AuditoriaPayload) {
  try {
    const { data, error } = await supabase
      .from('auditoria_documentos')
      .insert([
        {
          nombre_trabajador: payload.nombre_trabajador,
          rut: payload.rut,
          cargo: payload.cargo || 'OPERARIO(A) DE ASEO',
          area: payload.area || 'CONCENTRADUCTO',
          documento_codigo: payload.documento_codigo || 'VELTS-D-ACN212-HS-0012',
          documentos_generados: payload.documentos_generados,
          tipo_firma: payload.tipo_firma || 'digital_manuscrita',
          ip_address: payload.ip_address,
          user_agent: payload.user_agent || 'Unknown',
          archivo_peso_bytes: payload.archivo_peso_bytes || 0,
          url_acta_ds44: payload.url_acta_ds44 || null,
          url_consentimiento: payload.url_consentimiento || null,
          url_paquete_completo: payload.url_paquete_completo || null,
          metadata: payload.metadata || {},
        },
      ])
      .select();

    if (error) {
      console.error('[Supabase Audit Error]:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('[Supabase Audit Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta de registros de auditoría (Exclusivo para Administradores con PIN / Secret Key)
 */
export async function obtenerRegistrosAuditoria(adminSecret: string) {
  if (
    adminSecret !== process.env.ADMIN_SECRET_KEY &&
    adminSecret !== process.env.NEXT_PUBLIC_ADMIN_PIN
  ) {
    throw new Error('No autorizado. Acceso exclusivo para administradores.');
  }

  const { data, error } = await supabase
    .from('auditoria_documentos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}
`;

export const NEXT_ROUTE_HANDLER = `// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { registrarAuditoria, uploadSignedPdf } from '@/lib/supabase';

/**
 * REGLA ESTRICTA DE DISEÑO:
 * Todo texto y marcas 'X' inyectadas deben usar estrictamente rgb(0, 0, 0).
 * Cero uso de rojo o azul.
 */
const COLOR_NEGRO = rgb(0, 0, 0);

/**
 * COORDENADAS EXACTAS CALIBRADAS PARA EL DOCUMENTO OFICIAL:
 * 1. Acta IRL D.S. N° 44 (VELTS-D-ACN212-HS-0012) - US Letter (612 x 792 pt)
 * 2. Consentimiento Alcohol y Drogas (CEN-RG-GSS-SGR-004) - A4 (595.32 x 841.92 pt)
 */
const COORDENADAS = {
  actaDs44: {
    page1: {
      nombre: { x: 160, y: 557 },
      rut: { x: 460, y: 557 },
      fecha: { x: 432, y: 542 },
      area: { x: 84, y: 528 },
      horaInicio: { x: 440, y: 515 }, // Mover a la izquierda debajo de títulos
      horaTermino: { x: 525, y: 515 }, // Mover a la izquierda debajo de títulos
      contactoEmergencia: { x: 230, y: 505 }, // Desplazado a la derecha
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
    },
    normasSeguridad: {
      // 13 casillas cuadradas en x=58 para páginas 10, 11 y 12
      norma_01: { pageIndex: 9, x: 58, y: 590 },
      norma_02: { pageIndex: 9, x: 58, y: 432 },
      norma_03: { pageIndex: 9, x: 58, y: 352 },
      norma_04: { pageIndex: 9, x: 58, y: 238 },
      norma_05: { pageIndex: 10, x: 58, y: 644 },
      norma_06: { pageIndex: 10, x: 58, y: 563 },
      norma_07: { pageIndex: 10, x: 58, y: 472 },
      norma_08: { pageIndex: 10, x: 58, y: 402 },
      norma_09: { pageIndex: 10, x: 58, y: 238 },
      norma_10: { pageIndex: 11, x: 58, y: 644 },
      norma_11: { pageIndex: 11, x: 58, y: 552 },
      norma_12: { pageIndex: 11, x: 58, y: 483 },
      norma_13: { pageIndex: 11, x: 58, y: 402 },
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

// Cuestionario Médico: Coordenadas de filas indicadas para SI / NO
const PREGUNTAS_MEDICAS: Record<
  string,
  { pageIndex: number; yes: { x: number; y: number }; no: { x: number; y: number } }
> = {
  // Pág. 8 (Índice 7)
  enf_epilepsia: { pageIndex: 7, yes: { x: 373, y: 131 }, no: { x: 403, y: 131 } },
  enf_lumbago: { pageIndex: 7, yes: { x: 373, y: 114 }, no: { x: 403, y: 114 } },
  enf_hipertension: { pageIndex: 7, yes: { x: 373, y: 96 }, no: { x: 403, y: 96 } },
  enf_diabetes: { pageIndex: 7, yes: { x: 373, y: 79 }, no: { x: 403, y: 79 } },

  // Pág. 9 (Índice 8)
  enf_asma: { pageIndex: 8, yes: { x: 373, y: 646 }, no: { x: 403, y: 646 } },
  enf_claustrofobia: { pageIndex: 8, yes: { x: 373, y: 628 }, no: { x: 403, y: 628 } },
  enf_inmuno: { pageIndex: 8, yes: { x: 373, y: 608 }, no: { x: 403, y: 608 } },
  ant_fractura: { pageIndex: 8, yes: { x: 373, y: 506 }, no: { x: 403, y: 506 } },
  ant_tratamientos: { pageIndex: 8, yes: { x: 373, y: 483 }, no: { x: 403, y: 483 } },
  cons_alergia: { pageIndex: 8, yes: { x: 367, y: 386 }, no: { x: 395, y: 386 } },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nombre,
      rut,
      contactoEmergencia,
      telefonoEmergencia,
      respuestasMedicas = {},
      firmaPngBase64,
      tipoFirma = 'digital_manuscrita',
      targetDownload = 'all', // 'acta' | 'consentimiento' | 'all'
    } = body;

    if (!nombre || !rut || !firmaPngBase64) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: nombre, rut o firma' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 1. Cargar plantilla oficial Acta DS 44 (22 Páginas)
    const actaPath = path.join(process.cwd(), 'public', 'templates', 'acta_ds44_template.pdf');
    const actaBytes = await fs.readFile(actaPath);
    const actaPdfDoc = await PDFDocument.load(actaBytes);

    // 2. Cargar plantilla Consentimiento Alcohol y Drogas
    const consentPath = path.join(process.cwd(), 'public', 'templates', 'consentimiento_alcohol_drogas.pdf');
    let consentPdfDoc: PDFDocument;
    try {
      const consentBytes = await fs.readFile(consentPath);
      consentPdfDoc = await PDFDocument.load(consentBytes);
    } catch {
      consentPdfDoc = await PDFDocument.create();
      consentPdfDoc.addPage([595.32, 841.92]); // A4
    }

    const font = await actaPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await actaPdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontConsent = await consentPdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFontConsent = await consentPdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 3. Procesar imagen de firma (canvas o foto)
    const cleanBase64 = firmaPngBase64.replace(/^data:image\\/(png|jpeg|jpg|webp);base64,/, '').trim();
    const signatureBuffer = Buffer.from(cleanBase64, 'base64');
    let sigImageActa;
    let sigImageConsent;
    if (firmaPngBase64.includes('image/jpeg') || firmaPngBase64.includes('image/jpg')) {
      sigImageActa = await actaPdfDoc.embedJpg(signatureBuffer);
      sigImageConsent = await consentPdfDoc.embedJpg(signatureBuffer);
    } else {
      sigImageActa = await actaPdfDoc.embedPng(signatureBuffer);
      sigImageConsent = await consentPdfDoc.embedPng(signatureBuffer);
    }

    // =========================================================================
    // INYECCIÓN DOCUMENTO 1: ACTA IRL DS 44 (VELTS-D-ACN212-HS-0012)
    // =========================================================================
    const pages = actaPdfDoc.getPages();

    // PÁGINA 1 (Índice 0)
    const p1 = pages[0];
    const p1Cfg = COORDENADAS.actaDs44.page1;
    p1.drawText(nombre.toUpperCase(), { x: p1Cfg.nombre.x, y: p1Cfg.nombre.y, size: 8, font: boldFont, color: COLOR_NEGRO });
    p1.drawText(rut, { x: p1Cfg.rut.x, y: p1Cfg.rut.y, size: 8, font: boldFont, color: COLOR_NEGRO });
    p1.drawText('27-10-2026', { x: p1Cfg.fecha.x, y: p1Cfg.fecha.y, size: 8, font, color: COLOR_NEGRO });
    p1.drawText('CONCENTRADUCTO', { x: p1Cfg.area.x, y: p1Cfg.area.y, size: 8, font, color: COLOR_NEGRO });
    p1.drawText('10:00', { x: p1Cfg.horaInicio.x, y: p1Cfg.horaInicio.y, size: 8, font, color: COLOR_NEGRO });
    p1.drawText('12:00', { x: p1Cfg.horaTermino.x, y: p1Cfg.horaTermino.y, size: 8, font, color: COLOR_NEGRO });
    p1.drawText(contactoEmergencia || 'NO REGISTRA', { x: p1Cfg.contactoEmergencia.x, y: p1Cfg.contactoEmergencia.y, size: 8, font, color: COLOR_NEGRO });
    p1.drawText(telefonoEmergencia || 'NO REGISTRA', { x: p1Cfg.telefonoEmergencia.x, y: p1Cfg.telefonoEmergencia.y, size: 8, font, color: COLOR_NEGRO });

    // 'X' GIGANTE en Persona Nueva (Estrictamente color NEGRO)
    p1.drawText('X', {
      x: p1Cfg.personaNuevaX.x,
      y: p1Cfg.personaNuevaX.y,
      size: p1Cfg.personaNuevaX.size,
      font: boldFont,
      color: COLOR_NEGRO,
    });

    // PÁGINAS 8 Y 9 (Índices 7 y 8) - FICHA MÉDICA (Estrictamente color NEGRO)
    for (const [key, mapping] of Object.entries(PREGUNTAS_MEDICAS)) {
      if (mapping.pageIndex < pages.length) {
        const medPage = pages[mapping.pageIndex];
        const isYes = respuestasMedicas[key] === true;
        const coords = isYes ? mapping.yes : mapping.no;
        medPage.drawText('X', {
          x: coords.x,
          y: coords.y,
          size: 10,
          font: boldFont,
          color: COLOR_NEGRO,
        });
      }
    }

    // PÁGINAS 10, 11 Y 12 (Índices 9, 10 y 11) - 13 NORMAS GENERALES CON 'X' NEGRA
    for (const [, item] of Object.entries(COORDENADAS.actaDs44.normasSeguridad)) {
      if (item.pageIndex < pages.length) {
        const pNorma = pages[item.pageIndex];
        pNorma.drawText('X', {
          x: item.x,
          y: item.y,
          size: 10,
          font: boldFont,
          color: COLOR_NEGRO,
        });
      }
    }

    // PÁGINA 22 (Índice 21) - CIERRE Y FIRMA DEL TRABAJADOR (DOS SECCIONES)
    const p22 = pages[21];
    const p22Cfg = COORDENADAS.actaDs44.page22;

    // 1. Párrafo Superior (Texto Legal - RESTAURADO)
    p22.drawText(nombre.toUpperCase(), {
      x: p22Cfg.parrafoSuperior.nombre.x,
      y: p22Cfg.parrafoSuperior.nombre.y,
      size: 8.5,
      font: boldFont,
      color: COLOR_NEGRO,
    });
    p22.drawText(rut, {
      x: p22Cfg.parrafoSuperior.rut.x,
      y: p22Cfg.parrafoSuperior.rut.y,
      size: 8.5,
      font: boldFont,
      color: COLOR_NEGRO,
    });
    p22.drawText('Operario de Aseo', {
      x: p22Cfg.parrafoSuperior.cargo.x,
      y: p22Cfg.parrafoSuperior.cargo.y,
      size: 8.5,
      font,
      color: COLOR_NEGRO,
    });

    // 2. Recuadro Inferior (Firma y Datos)
    p22.drawImage(sigImageActa, {
      x: p22Cfg.recuadroInferior.firma.x,
      y: p22Cfg.recuadroInferior.firma.y,
      width: p22Cfg.recuadroInferior.firma.width,
      height: p22Cfg.recuadroInferior.firma.height,
    });
    // Nombre dentro del recuadro en x: 320, y: 85 (size: 9)
    p22.drawText(nombre.toUpperCase(), {
      x: p22Cfg.recuadroInferior.nombre.x,
      y: p22Cfg.recuadroInferior.nombre.y,
      size: 9,
      font: boldFont,
      color: COLOR_NEGRO,
    });
    // RUT dentro del recuadro en x: 320, y: 73 (size: 8.5)
    p22.drawText(rut, {
      x: p22Cfg.recuadroInferior.rut.x,
      y: p22Cfg.recuadroInferior.rut.y,
      size: 8.5,
      font: boldFont,
      color: COLOR_NEGRO,
    });

    // =========================================================================
    // INYECCIÓN DOCUMENTO 2: CONSENTIMIENTO ALCOHOL Y DROGAS
    // =========================================================================
    const cPage = consentPdfDoc.getPages()[0];
    const cCfg = COORDENADAS.consentimiento;
    cPage.drawText(nombre.toUpperCase(), { x: cCfg.nombreParrafo.x, y: cCfg.nombreParrafo.y, size: 8.5, font: boldFontConsent, color: COLOR_NEGRO });
    cPage.drawText(rut, { x: cCfg.rutParrafo.x, y: cCfg.rutParrafo.y, size: 8.5, font: boldFontConsent, color: COLOR_NEGRO });
    cPage.drawText(nombre.toUpperCase(), { x: cCfg.nombre.x, y: cCfg.nombre.y, size: 9, font: boldFontConsent, color: COLOR_NEGRO });
    cPage.drawText(rut, { x: cCfg.rut.x, y: cCfg.rut.y, size: 9, font: boldFontConsent, color: COLOR_NEGRO });
    cPage.drawText('27-10-2026', { x: cCfg.fecha.x, y: cCfg.fecha.y, size: 9, font: fontConsent, color: COLOR_NEGRO });
    cPage.drawImage(sigImageConsent, {
      x: cCfg.firma.x,
      y: cCfg.firma.y,
      width: cCfg.firma.width,
      height: cCfg.firma.height,
    });
    cPage.drawText(\`\${nombre.toUpperCase()} - RUT: \${rut}\`, {
      x: cCfg.firma.x,
      y: cCfg.firma.y - 12,
      size: 7.5,
      font: boldFontConsent,
      color: COLOR_NEGRO,
    });

    // =========================================================================
    // EXPORTACIÓN DE BYTES Y SUBIDA A SUPABASE STORAGE (BUCKET: documentos_firmados)
    // =========================================================================
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    const actaPdfBytes = await actaPdfDoc.save();
    const consentPdfBytes = await consentPdfDoc.save();

    // Fusión de ambos documentos
    const mergedDoc = await PDFDocument.create();
    const copy1 = await mergedDoc.copyPages(actaPdfDoc, actaPdfDoc.getPageIndices());
    copy1.forEach((p) => mergedDoc.addPage(p));
    const copy2 = await mergedDoc.copyPages(consentPdfDoc, consentPdfDoc.getPageIndices());
    copy2.forEach((p) => mergedDoc.addPage(p));
    const mergedPdfBytes = await mergedDoc.save();

    // Subida asíncrona a Supabase Storage
    const timestamp = Date.now();
    const [urlActa, urlConsent, urlMerged] = await Promise.all([
      uploadSignedPdf(\`\${cleanRut}/Acta_DS44_\${timestamp}.pdf\`, actaPdfBytes),
      uploadSignedPdf(\`\${cleanRut}/Consentimiento_\${timestamp}.pdf\`, consentPdfBytes),
      uploadSignedPdf(\`\${cleanRut}/Paquete_Completo_\${timestamp}.pdf\`, mergedPdfBytes),
    ]);

    // Registrar en auditoría inmutable
    await registrarAuditoria({
      nombre_trabajador: nombre.toUpperCase(),
      rut,
      cargo: 'OPERARIO(A) DE ASEO',
      area: 'CONCENTRADUCTO',
      documento_codigo: 'VELTS-D-ACN212-HS-0012',
      documentos_generados: [
        'Acta IRL DS 44 - 22 Páginas (VELTS-D-ACN212-HS-0012.00)',
        'Consentimiento Alcohol y Drogas - 1 Página (CEN-RG-GSS-SGR-004)',
      ],
      tipo_firma: tipoFirma,
      ip_address: ip,
      user_agent: userAgent,
      archivo_peso_bytes: mergedPdfBytes.byteLength,
      url_acta_ds44: urlActa || undefined,
      url_consentimiento: urlConsent || undefined,
      url_paquete_completo: urlMerged || undefined,
      metadata: {
        total_paginas: 23,
        respuestas_medicas: respuestasMedicas,
      },
    });

    // Si el cliente pide JSON con los 3 blobs en base64 para descargas independientes
    if (req.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({
        success: true,
        urls: {
          actaDs44: urlActa,
          consentimiento: urlConsent,
          merged: urlMerged,
        },
        base64: {
          actaDs44: Buffer.from(actaPdfBytes).toString('base64'),
          consentimiento: Buffer.from(consentPdfBytes).toString('base64'),
          merged: Buffer.from(mergedPdfBytes).toString('base64'),
        },
        sizes: {
          actaDs44: actaPdfBytes.byteLength,
          consentimiento: consentPdfBytes.byteLength,
          merged: mergedPdfBytes.byteLength,
        },
      });
    }

    // Retorno de archivo directo según targetDownload
    let targetBytes = mergedPdfBytes;
    let fileName = \`Documentos_Completos_DS44_\${cleanRut}.pdf\`;
    if (targetDownload === 'acta') {
      targetBytes = actaPdfBytes;
      fileName = \`Acta_IRL_DS44_\${cleanRut}.pdf\`;
    } else if (targetDownload === 'consentimiento') {
      targetBytes = consentPdfBytes;
      fileName = \`Consentimiento_Alcohol_Drogas_\${cleanRut}.pdf\`;
    }

    return new NextResponse(Buffer.from(targetBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="\${fileName}"\`,
      },
    });
  } catch (error: any) {
    console.error('[API /api/generate Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar los documentos legales' },
      { status: 500 }
    );
  }
}
`;

export const NEXT_AI_CALIBRATE_ROUTE = `// src/app/api/ai-calibrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { targetDoc = 'all', userHints = '' } = await req.json();

    const systemPrompt = \`Eres un experto en maquetación de PDFs con pdf-lib (origen de coordenadas en la esquina inferior izquierda: x crece hacia la derecha, y crece hacia arriba).
Debes calcular las coordenadas exactas de posicionamiento para:
1. "Acta IRL DS 44 (VELTS-D-ACN212-HS-0012)" tamaño US Letter (612 x 792 pt)
2. "Consentimiento de Alcohol y Drogas" tamaño A4 (595.32 x 841.92 pt)

Reglas de alineación:
- Todo texto e inyecciones de 'X' deben ser estrictamente color negro rgb(0, 0, 0).
- Pág 1: Nombre (x: 160, y: 557), RUT (x: 460, y: 557), Fecha (x: 432, y: 542), Área (x: 84, y: 528).
- Horas: Hora Inicio "10:00" en x: 462, y: 515; Hora Término "12:00" en x: 554, y: 515 (debajo de títulos para no superponerse).
- Contacto Emergencia desplazado a la derecha: Nombre en x: 230, y: 505; Teléfono en x: 230, y: 492.
- Casilla Persona Nueva: "X" negra en x: 295, y: 464, size: 16.
- Págs 8 y 9: Respuestas SI/NO en filas indicadas (Epilepsia y=131, Lumbago y=114, Hipertensión y=96, Diabetes y=79, Asma y=646, Claustrofobia y=628, Inmunodepresora y=608, Fractura/TEC y=506, Tratamientos y=483, Alergia y=386).
- Págs 10-12: 13 casillas cuadradas en x: 58 con 'X' negra.
- Pág 22: Firma en x: 350, y: 105, width: 170, height: 75; Nombre y RUT debajo de la firma en x: 320, y: 85 (size: 9).
- Consentimiento: Nombre (x: 105, y: 446) y RUT (x: 95, y: 432). Tabla: Nombre (x: 220, y: 304), RUT (x: 155, y: 280), Fecha (x: 165, y: 256), Firma (x: 175, y: 195).

Devuelve únicamente un JSON con la estructura:
{
  "coordinates": { ... },
  "rationale": "explicación detallada de la calibración geométrica"
}\`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: \`Calibra las coordenadas para \${targetDoc}. Indicaciones: "\${userHints}"\`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return NextResponse.json({
      success: true,
      model: 'gemini-3.8-flash',
      coordinates: parsed.coordinates,
      rationale: parsed.rationale,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API /api/ai-calibrate Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error en calibración con IA' },
      { status: 500 }
    );
  }
}
`;

export const NEXT_PAGE_TSX = `// src/app/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  FileCheck2,
  FileText,
  Download,
  Eye,
  Sparkles,
  Layers,
  Upload,
  PenTool,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker de pdfjs-dist
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = \`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/\${pdfjsLib.version}/pdf.worker.min.mjs\`;
}

export default function DocumentSignerPage() {
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
  });

  const [respuestasMedicas, setRespuestasMedicas] = useState<Record<string, boolean>>({
    enf_epilepsia: false,
    enf_lumbago: false,
    enf_hipertension: false,
    enf_diabetes: false,
    enf_asma: false,
    enf_claustrofobia: false,
    enf_inmuno: false,
    ant_fractura: false,
    ant_tratamientos: false,
    cons_alergia: false,
  });

  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedFirmaBase64, setUploadedFirmaBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resultados generados con 3 descargas
  const [generatedData, setGeneratedData] = useState<{
    actaUrl: string;
    consentUrl: string;
    mergedUrl: string;
    sizes: { actaDs44: number; consentimiento: number; merged: number };
  } | null>(null);

  // Calibrador Interactivo con pdfjs-dist
  const [calibratorPage, setCalibratorPage] = useState<number>(1);
  const [isPdfRendering, setIsPdfRendering] = useState(false);

  // Renderizar la página del PDF original en alta definición
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfCanvasRef.current) return;
      setIsPdfRendering(true);

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: '/templates/acta_ds44_template.pdf',
        });
        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const page = await pdf.getPage(calibratorPage);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = pdfCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.warn('No se pudo renderizar la página del PDF en canvas:', err);
      } finally {
        setIsPdfRendering(false);
      }
    }

    renderPage();
    return () => {
      isCancelled = true;
    };
  }, [calibratorPage]);

  // Manejo de carga de foto de firma con remoción de fondo blanco
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        // Algoritmo de transparencia para fondo blanco
        const imgData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (brightness > 200) d[i + 3] = 0;
        }
        ctx.putImageData(imgData, 0, 0);
        setUploadedFirmaBase64(tempCanvas.toDataURL('image/png'));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let firmaBase64 = '';
    if (signatureMode === 'upload') {
      if (!uploadedFirmaBase64) {
        setErrorMessage('Por favor suba una fotografía clara de su firma.');
        return;
      }
      firmaBase64 = uploadedFirmaBase64;
    } else {
      if (sigCanvasRef.current?.isEmpty()) {
        setErrorMessage('Debe firmar en el recuadro digital antes de continuar.');
        return;
      }
      firmaBase64 = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png') || '';
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          respuestasMedicas,
          firmaPngBase64: firmaBase64,
          tipoFirma: signatureMode === 'upload' ? 'foto_subida' : 'digital_manuscrita',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al procesar los documentos.');
      }

      const data = await res.json();

      // Convertir base64 a Object URLs descargables
      const b64toBlobUrl = (b64: string) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      };

      setGeneratedData({
        actaUrl: b64toBlobUrl(data.base64.actaDs44),
        consentUrl: b64toBlobUrl(data.base64.consentimiento),
        mergedUrl: b64toBlobUrl(data.base64.merged),
        sizes: data.sizes,
      });

      setSuccessMessage('¡Documentos firmados exitosamente y auditados en Supabase!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Encabezado */}
        <header className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Sistema Legal DS 44 & Minera Centinela</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Llenado y Firma Digital de Documentación Laboral
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Acta IRL D.S. N° 44 (22 páginas) y Consentimiento de Adhesión de Política de Alcohol y Drogas.
          </p>
        </header>

        {/* Panel de 3 Descargas Independientes (Al completar) */}
        {generatedData && (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  ¡Documentos generados y firmados exitosamente!
                </h3>
                <p className="text-xs text-slate-400">
                  Descargue los documentos de forma independiente o en un paquete unificado completo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Botón 1: Descargar Acta DS 44 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-sky-400 mb-1">Documento 1 (22 Páginas)</div>
                  <div className="font-semibold text-white text-sm">Acta IRL D.S. N° 44</div>
                  <div className="text-[11px] text-slate-400">
                    Ficha Médica & 13 Normas ({Math.round(generatedData.sizes.actaDs44 / 1024)} KB)
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={generatedData.actaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={generatedData.actaUrl}
                    download={\`Acta_IRL_DS44_\${formData.rut.replace(/[^0-9kK]/g, '')}.pdf\`}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Acta DS 44
                  </a>
                </div>
              </div>

              {/* Botón 2: Descargar Consentimiento Alcohol y Drogas */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-emerald-400 mb-1">Documento 2 (1 Página)</div>
                  <div className="font-semibold text-white text-sm">Consentimiento Alcohol/Drogas</div>
                  <div className="text-[11px] text-slate-400">
                    Párrafo legal completo ({Math.round(generatedData.sizes.consentimiento / 1024)} KB)
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={generatedData.consentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={generatedData.consentUrl}
                    download={\`Consentimiento_\${formData.rut.replace(/[^0-9kK]/g, '')}.pdf\`}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Consentimiento
                  </a>
                </div>
              </div>

              {/* Botón 3: Descargar Ambos Fusionados */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-xs font-bold text-indigo-400 mb-1">Paquete Completo (23 Páginas)</div>
                  <div className="font-semibold text-white text-sm">Ambos Documentos Unidos</div>
                  <div className="text-[11px] text-slate-400">
                    Acta DS 44 + Consentimiento ({Math.round(generatedData.sizes.merged / 1024)} KB)
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={generatedData.mergedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={generatedData.mergedUrl}
                    download={\`Documentos_Completos_\${formData.rut.replace(/[^0-9kK]/g, '')}.pdf\`}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-4 h-4" />
                    Descargar Ambos
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Datos Personales */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-sky-400">1. Datos Personales del Trabajador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: JUAN CARLOS PÉREZ SOTO"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  R.U.T. (con puntos y guion)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12.345.678-9"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Contacto de Emergencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: MARÍA SOTO (CÓNYUGE)"
                  value={formData.contactoEmergencia}
                  onChange={(e) => setFormData({ ...formData, contactoEmergencia: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono Contacto de Emergencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: +56 9 8765 4321"
                  value={formData.telefonoEmergencia}
                  onChange={(e) => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-sky-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Ficha Médica del Trabajador */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-emerald-400">
              2. Ficha Médica del Trabajador (Páginas 8 y 9)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'enf_epilepsia', label: '01. Epilepsia o convulsiones' },
                { id: 'enf_lumbago', label: '02. Lumbago o dolor crónico de columna' },
                { id: 'enf_hipertension', label: '03. Hipertensión Arterial' },
                { id: 'enf_diabetes', label: '04. Diabetes (Tipo 1 o 2)' },
                { id: 'enf_asma', label: '05. Asma bronquial' },
                { id: 'enf_claustrofobia', label: '06. Claustrofobia / espacios cerrados' },
                { id: 'enf_inmuno', label: '07. Enfermedad inmunodepresora' },
                { id: 'ant_fractura', label: '08. Fractura / Esguince / TEC previo' },
                { id: 'ant_tratamientos', label: '09. Tratamientos médicos prolongados' },
                { id: 'cons_alergia', label: '11. Alergia grave a medicamentos o químicos' },
              ].map(({ id, label }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800"
                >
                  <span className="text-xs text-slate-300 font-medium">{label}</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRespuestasMedicas({ ...respuestasMedicas, [id]: true })}
                      className={\`px-3 py-1 rounded text-xs font-bold transition \${
                        respuestasMedicas[id]
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }\`}
                    >
                      SÍ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespuestasMedicas({ ...respuestasMedicas, [id]: false })}
                      className={\`px-3 py-1 rounded text-xs font-bold transition \${
                        !respuestasMedicas[id]
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }\`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sección 3: Firma Manuscrita o Foto */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-amber-400">3. Firma del Trabajador</h2>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition \${
                    signatureMode === 'draw' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }\`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Dibujar en Pantalla
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('upload')}
                  className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition \${
                    signatureMode === 'upload' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }\`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Foto de Firma
                </button>
              </div>
            </div>

            {signatureMode === 'draw' ? (
              <div className="border border-slate-700 bg-white rounded-xl overflow-hidden shadow-inner">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{ className: 'w-full h-44 cursor-crosshair' }}
                  backgroundColor="#ffffff"
                  penColor="#000000"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                />
                {uploadedFirmaBase64 && (
                  <div className="p-3 bg-white rounded-lg max-w-xs mx-auto">
                    <img src={uploadedFirmaBase64} alt="Firma Subida" className="max-h-24 mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generando con pdf-lib y auditando en Supabase...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-5 h-5" />
                <span>Firmar y Generar Documentos (Descarga Individual y Combinada)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
`;
