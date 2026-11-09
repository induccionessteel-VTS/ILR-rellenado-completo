import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DEFAULT_COORDINATES, MEDICAL_QUESTIONS, NORMAS_SEGURIDAD_ITEMS, STATIC_VALUES, formatDateChileLong } from './constants';
import { CoordinateConfig, GeneratedDocumentsResult, WorkerFormData } from './types';

/**
 * Convierte un Data URL o Base64 a Uint8Array de forma segura
 * Funciona de forma idéntica en Node.js y en el Navegador
 */
export function base64ToUint8Array(base64String: string): Uint8Array {
  const cleanBase64 = base64String.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '').trim();
  if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const buffer = Buffer.from(cleanBase64, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Carga el PDF oficial del Acta IRL DS 44 (VELTS-D-ACN212-HS-0012)
 * Intenta cargar el archivo real adjunto tanto en entorno Navegador como Node.js
 */
export async function loadRealDs44Template(): Promise<PDFDocument> {
  // 1. Entorno de Navegador: Intentar fetch del archivo en /assets/ o /templates/
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const candidateUrls = [
      '/assets/aistudio/VELTS-D-ACN212-HS-0012.00_-_IRL_DS_44_-_OPERARIO_A__DE_ASEO__3__ebcace49.pdf',
      '/templates/VELTS-D-ACN212-HS-0012.00 - IRL DS 44 - OPERARIO(A) DE ASEO (3).pdf',
      '/templates/acta_ds44_template.pdf',
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return await PDFDocument.load(arrayBuffer);
        }
      } catch {
        // Continuar con el siguiente candidato
      }
    }
  }

  // 2. Entorno Node.js: Intentar leer del sistema de archivos local
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidatePaths = [
        path.join(
          process.cwd(),
          'public',
          'assets',
          'aistudio',
          'VELTS-D-ACN212-HS-0012.00_-_IRL_DS_44_-_OPERARIO_A__DE_ASEO__3__ebcace49.pdf'
        ),
        path.join(
          process.cwd(),
          'public',
          'templates',
          'VELTS-D-ACN212-HS-0012.00 - IRL DS 44 - OPERARIO(A) DE ASEO (3).pdf'
        ),
        path.join(process.cwd(), 'public', 'templates', 'acta_ds44_template.pdf'),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          return await PDFDocument.load(buf);
        }
      }
    } catch {
      // Ignorar y recurrir al generador de respaldo
    }
  }

  // 3. Respaldo sintético con dimensiones US Letter (612 x 792 pt)
  return await createMockDs44Template();
}

/**
 * Genera el documento de respaldo sintético en caso de que no esté el archivo físico
 */
export async function createMockDs44Template(): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < 22; i++) {
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const pageNum = i + 1;

    // Encabezado
    page.drawText('VELTS / Steel Ingeniería S.A. - Acta IRL D.S. N° 44 (VELTS-D-ACN212-HS-0012)', {
      x: 54,
      y: 750,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.45),
    });

    page.drawText(`Página ${pageNum} de 22 - Documento Oficial de Seguridad`, {
      x: 54,
      y: 735,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    if (i === 0) {
      // Página 1 esquema
      page.drawText('DATOS PERSONALES', { x: 263, y: 574, size: 10, font: boldFont });
      page.drawText('Nombre y Apellidos: _____________________________ R.U.N.: __________________', { x: 54, y: 557, size: 8, font });
      page.drawText('Cargo: OPERARIO(A) DE ASEO                        Fecha: __________________', { x: 54, y: 542, size: 8, font });
      page.drawText('Área: ___________________________ Hora de Inicio: ________ Hora Término: ________', { x: 54, y: 528, size: 8, font });
      page.drawText('Nombre contacto de emergencia: __________________________________________', { x: 54, y: 505, size: 8, font });
      page.drawText('Teléfono contacto de emergencia: _________________________________________', { x: 54, y: 492, size: 8, font });
      page.drawText('Indique con una cruz el estatus del trabajador(a)', { x: 54, y: 480, size: 8, font: boldFont });
      page.drawText('Persona Nueva [   ]', { x: 54, y: 466, size: 8, font });
    } else if (i === 7 || i === 8) {
      page.drawText(`FICHA MÉDICA DEL TRABAJADOR(A) - PÁGINA ${pageNum}`, { x: 54, y: 700, size: 10, font: boldFont });
    } else if (i >= 9 && i <= 11) {
      page.drawText(`6. NORMAS GENERALES DE SEGURIDAD - PÁGINA ${pageNum}`, { x: 54, y: 700, size: 10, font: boldFont });
    } else if (i === 21) {
      page.drawText('INFORMACIÓN DE RIESGOS LABORALES IRL - CIERRE Y FIRMA', { x: 54, y: 646, size: 10, font: boldFont });
      page.drawRectangle({ x: 290, y: 95, width: 165, height: 80, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1 });
      page.drawText('Nombre, Rut y Firma del trabajador(a)', { x: 300, y: 180, size: 8, font: boldFont });
    }
  }

  return pdfDoc;
}

/**
 * Carga la plantilla de la Hoja 1 de Consentimiento (Anexo 01 Minera Centinela)
 */
export async function loadRealConsentimientoHoja1Template(): Promise<PDFDocument> {
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const urls = [
      '/templates/HOJA_1_CONSENT_AYD_MUELLE.pdf',
      '/assets/aistudio/HOJA_1_CONSENT_AYD_MUELLE_ok_33f0eb3e.pdf',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return await PDFDocument.load(ab);
        }
      } catch {
        // siguiente
      }
    }
  }

  if (typeof process !== 'undefined' && process.cwd) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.join(process.cwd(), 'public', 'templates', 'HOJA_1_CONSENT_AYD_MUELLE.pdf'),
        path.join(process.cwd(), 'public', 'assets', 'aistudio', 'HOJA_1_CONSENT_AYD_MUELLE_ok_33f0eb3e.pdf'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          return await PDFDocument.load(buf);
        }
      }
    } catch {
      // fallback
    }
  }

  // Respaldo sintético para Hoja 1 (Anexo 01)
  const mockDoc = await PDFDocument.create();
  const font = await mockDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await mockDoc.embedFont(StandardFonts.HelveticaBold);
  const p = mockDoc.addPage([612, 792]);
  p.drawText('ANEXO 01: Consentimiento de Adhesión EECC', { x: 84, y: 710, size: 11, font: boldFont });
  p.drawText('Consentimiento de Adhesión de Política de Alcohol y Drogas de Minera Centinela para EECC', { x: 140, y: 650, size: 9, font: boldFont });
  p.drawText('Nombre Completo: JONATHAN POOL ALARCON BARAZORDA', { x: 121, y: 330, size: 9, font });
  p.drawText('Rut: 22518451-8', { x: 121, y: 307, size: 9, font });
  p.drawText('Fecha:  31 de Julio 2026', { x: 121, y: 283, size: 9, font });
  return mockDoc;
}

/**
 * Carga la plantilla real de Consentimiento de Alcohol y Drogas completa (2 Páginas):
 * - Hoja 1: Anexo 01 de Minera Centinela (Consentimiento de Adhesión EECC)
 * - Hoja 2: Anexo 02 Consentimiento del Trabajador Colaborador
 */
export async function loadRealConsentimientoTemplate(): Promise<PDFDocument> {
  const combinedDoc = await PDFDocument.create();

  // 1. Cargar Hoja 1 (Anexo 01)
  const hoja1Doc = await loadRealConsentimientoHoja1Template();
  const [copiedHoja1] = await combinedDoc.copyPages(hoja1Doc, [0]);
  combinedDoc.addPage(copiedHoja1);

  // 2. Cargar Hoja 2 (Anexo 02)
  let hoja2Doc: PDFDocument | null = null;
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const urls = [
      '/templates/Consentimiento Alcohol y Drogas del Trabajador HOJA 2.pdf',
      '/templates/consentimiento_alcohol_drogas.pdf',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          hoja2Doc = await PDFDocument.load(ab);
          break;
        }
      } catch {
        // siguiente
      }
    }
  }

  if (!hoja2Doc && typeof process !== 'undefined' && process.cwd) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.join(process.cwd(), 'public', 'templates', 'Consentimiento Alcohol y Drogas del Trabajador HOJA 2.pdf'),
        path.join(process.cwd(), 'public', 'templates', 'consentimiento_alcohol_drogas.pdf'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          hoja2Doc = await PDFDocument.load(buf);
          break;
        }
      }
    } catch {
      // fallback
    }
  }

  if (!hoja2Doc) {
    hoja2Doc = await createMockConsentimientoHoja2();
  }

  const [copiedHoja2] = await combinedDoc.copyPages(hoja2Doc, [0]);
  combinedDoc.addPage(copiedHoja2);

  return combinedDoc;
}

/**
 * Genera el documento de respaldo sintético para Hoja 2 (Anexo 02)
 */
async function createMockConsentimientoHoja2(): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.32, 841.92]); // A4

  page.drawText('ANEXO 02: Consentimiento del Trabajador Colaborador', {
    x: 83,
    y: 647,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.35),
  });

  page.drawText('Consentimiento de Adhesión de Política de Alcohol y Drogas de Minera Centinela', {
    x: 117,
    y: 494,
    size: 10,
    font: boldFont,
  });

  page.drawText('Yo____________________________, cédula nacional de identidad N°', {
    x: 83,
    y: 446,
    size: 9,
    font,
  });

  page.drawText('____________________, declaro que he tomado conocimiento de la Política de Alcohol y', {
    x: 83,
    y: 432,
    size: 9,
    font,
  });

  page.drawText('Nombre Completo:', { x: 117, y: 304, size: 9, font: boldFont });
  page.drawText('Rut:', { x: 117, y: 280, size: 9, font: boldFont });
  page.drawText('Fecha:', { x: 117, y: 256, size: 9, font: boldFont });
  page.drawText('Firma:', { x: 117, y: 232, size: 9, font: boldFont });

  return pdfDoc;
}

/**
 * Genera el documento de respaldo sintético de 2 páginas para Consentimiento de Alcohol y Drogas
 */
export async function createMockConsentimientoTemplate(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Hoja 1 (Anexo 01)
  const page1 = doc.addPage([612, 792]);
  page1.drawText('ANEXO 01: Consentimiento de Adhesión EECC', { x: 84, y: 710, size: 11, font: boldFont });
  page1.drawText('Consentimiento de Adhesión de Política de Alcohol y Drogas de Minera Centinela para EECC', { x: 140, y: 650, size: 9, font: boldFont });
  page1.drawText('Nombre Completo: JONATHAN POOL ALARCON BARAZORDA', { x: 121, y: 330, size: 9, font });
  page1.drawText('Rut: 22518451-8', { x: 121, y: 307, size: 9, font });
  page1.drawText('Fecha:  31 de Julio 2026', { x: 121, y: 283, size: 9, font });

  // Hoja 2 (Anexo 02)
  const page2 = doc.addPage([595.32, 841.92]); // A4
  page2.drawText('ANEXO 02: Consentimiento del Trabajador Colaborador', {
    x: 83,
    y: 647,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.35),
  });
  page2.drawText('Consentimiento de Adhesión de Política de Alcohol y Drogas de Minera Centinela', {
    x: 117,
    y: 494,
    size: 10,
    font: boldFont,
  });
  page2.drawText('Yo____________________________, cédula nacional de identidad N°', {
    x: 83,
    y: 446,
    size: 9,
    font,
  });
  page2.drawText('____________________, declaro que he tomado conocimiento de la Política de Alcohol y', {
    x: 83,
    y: 432,
    size: 9,
    font,
  });
  page2.drawText('Nombre Completo:', { x: 117, y: 304, size: 9, font: boldFont });
  page2.drawText('Rut:', { x: 117, y: 280, size: 9, font: boldFont });
  page2.drawText('Fecha:', { x: 117, y: 256, size: 9, font: boldFont });
  page2.drawText('Firma:', { x: 117, y: 232, size: 9, font: boldFont });

  return doc;
}

/**
 * Inyecta los datos y firma en el Documento 1: Acta IRL DS 44 (22 Páginas)
 */
export async function fillActaDs44(
  pdfDoc: PDFDocument,
  formData: WorkerFormData,
  coordinates: CoordinateConfig = DEFAULT_COORDINATES
): Promise<PDFDocument> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  if (pages.length < 22) {
    throw new Error(`El PDF Acta DS 44 debe tener al menos 22 páginas. Tiene ${pages.length}.`);
  }

  // ---------------------------------------------------------------------------
  // PÁGINA 1 (Índice 0): Datos de la Empresa y Trabajador
  // ---------------------------------------------------------------------------
  const page1 = pages[0];
  const p1Cfg = coordinates.actaDs44.page1;

  // Datos dinámicos del trabajador alineados a las líneas del documento
  page1.drawText(formData.nombre.toUpperCase(), {
    x: p1Cfg.nombre.x,
    y: p1Cfg.nombre.y,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.rut, {
    x: p1Cfg.rut.x,
    y: p1Cfg.rut.y,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Fecha dinámica real del IRL del trabajador
  const fechaReal = formData.fecha || STATIC_VALUES.fecha;
  page1.drawText(fechaReal, {
    x: p1Cfg.fecha.x,
    y: p1Cfg.fecha.y,
    size: 8.5,
    font,
    color: rgb(0, 0, 0),
  });

  // Área 'Operaciones'
  page1.drawText(formData.area || STATIC_VALUES.area, {
    x: p1Cfg.area.x,
    y: p1Cfg.area.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  // Horario '08:00 a 18:00'
  page1.drawText(formData.horaInicio || STATIC_VALUES.horaInicio, {
    x: p1Cfg.horaInicio.x,
    y: p1Cfg.horaInicio.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.horaTermino || STATIC_VALUES.horaTermino, {
    x: p1Cfg.horaTermino.x,
    y: p1Cfg.horaTermino.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.contactoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.contactoEmergencia.x,
    y: p1Cfg.contactoEmergencia.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  page1.drawText(formData.telefonoEmergencia || 'NO REGISTRA', {
    x: p1Cfg.telefonoEmergencia.x,
    y: p1Cfg.telefonoEmergencia.y,
    size: 8,
    font,
    color: rgb(0, 0, 0),
  });

  // "X" GIGANTE en la casilla de "Persona Nueva" (Estrictamente color NEGRO)
  page1.drawText('X', {
    x: p1Cfg.personaNuevaX.x,
    y: p1Cfg.personaNuevaX.y,
    size: p1Cfg.personaNuevaX.size || 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // ---------------------------------------------------------------------------
  // PÁGINA 1: PERSONA SENSIBLE AL RIESGO (SI / NO y Categoría Específica)
  // ---------------------------------------------------------------------------
  const riesgoCfg = p1Cfg.sensibleRiesgo || DEFAULT_COORDINATES.actaDs44.page1.sensibleRiesgo;
  if (riesgoCfg) {
    if (formData.esSensibleRiesgo === true) {
      // 'X' en la casilla SI
      page1.drawText('X', {
        x: riesgoCfg.si.x,
        y: riesgoCfg.si.y,
        size: 13,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // 'X' en la subcategoría seleccionada
      if (formData.categoriaSensibleRiesgo && riesgoCfg.categorias[formData.categoriaSensibleRiesgo]) {
        const catCoord = riesgoCfg.categorias[formData.categoriaSensibleRiesgo];
        page1.drawText('X', {
          x: catCoord.x,
          y: catCoord.y,
          size: 11,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
      }
    } else {
      // 'X' en la casilla NO
      page1.drawText('X', {
        x: riesgoCfg.no.x,
        y: riesgoCfg.no.y,
        size: 13,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // PÁGINAS 8 Y 9 (Índices 7 y 8): CUESTIONARIO MÉDICO DEL TRABAJADOR
  // ---------------------------------------------------------------------------
  for (const q of MEDICAL_QUESTIONS) {
    if (q.pageIndex >= pages.length) continue;
    const targetPage = pages[q.pageIndex];
    const isYes = formData.respuestasMedicas[q.id] === true;
    const targetCoord = isYes ? q.coordsYes : q.coordsNo;

    // Dibuja una 'X' clara en la casilla SI o NO (Estrictamente color NEGRO)
    targetPage.drawText('X', {
      x: targetCoord.x,
      y: targetCoord.y,
      size: 9.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }

  // ---------------------------------------------------------------------------
  // PÁGINAS 10, 11 Y 12 (Índices 9, 10 y 11): 13 MÓDULOS DE NORMAS GENERALES DE SEGURIDAD
  // ---------------------------------------------------------------------------
  const normasCoords = coordinates.actaDs44.normasSeguridad || DEFAULT_COORDINATES.actaDs44.normasSeguridad;
  for (const norma of NORMAS_SEGURIDAD_ITEMS) {
    if (norma.pageIndex >= pages.length) continue;
    const page = pages[norma.pageIndex];
    const coord = normasCoords[norma.id] || norma.coord;

    // Dibuja la 'X' de verificación en cada módulo completado (Estrictamente color NEGRO)
    page.drawText('X', {
      x: coord.x,
      y: coord.y,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }

  // ---------------------------------------------------------------------------
  // PÁGINA 22 (Índice 21): CIERRE Y FIRMA DEL TRABAJADOR
  // ---------------------------------------------------------------------------
  const page22 = pages[21];
  const p22Cfg = coordinates.actaDs44.page22;

  // 1. PÁRRAFO SUPERIOR (Texto Legal - RESTAURADO)
  // Nombre del trabajador(a) en la primera línea en x: 160, y: 426
  page22.drawText(formData.nombre.toUpperCase(), {
    x: p22Cfg.parrafoSuperior?.nombre.x ?? 160,
    y: p22Cfg.parrafoSuperior?.nombre.y ?? 426,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // RUT en x: 95, y: 410
  page22.drawText(formData.rut, {
    x: p22Cfg.parrafoSuperior?.rut.x ?? 95,
    y: p22Cfg.parrafoSuperior?.rut.y ?? 410,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Cargo estático "Operario de Aseo" en x: 68, y: 395
  page22.drawText(STATIC_VALUES.cargoPage22, {
    x: p22Cfg.parrafoSuperior?.cargo.x ?? 68,
    y: p22Cfg.parrafoSuperior?.cargo.y ?? 395,
    size: 8.5,
    font,
    color: rgb(0, 0, 0),
  });

  // 2. RECUADRO INFERIOR (Firma y Datos)
  // Inserción de la firma digital en x: 295, y: 100 (width: 140, height: 60) - Desplazada a la izquierda para no tapar HUELLA
  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    let signatureImage;
    if (formData.firmaPngBase64.includes('image/jpeg') || formData.firmaPngBase64.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    } else {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    }

    const sigCfg = p22Cfg.recuadroInferior?.firma ?? p22Cfg.firma ?? { x: 295, y: 100, width: 140, height: 60 };
    page22.drawImage(signatureImage, {
      x: sigCfg.x,
      y: sigCfg.y,
      width: sigCfg.width,
      height: sigCfg.height,
    });
  }

  // Nombre dentro del recuadro a la izquierda en x: 295, y: 85 (size: 9)
  const nomBoxX = p22Cfg.recuadroInferior?.nombre.x ?? p22Cfg.nombre?.x ?? 295;
  const nomBoxY = p22Cfg.recuadroInferior?.nombre.y ?? p22Cfg.nombre?.y ?? 85;
  page22.drawText(formData.nombre.toUpperCase(), {
    x: nomBoxX,
    y: nomBoxY,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // RUT dentro del recuadro a la izquierda en x: 295, y: 73 (size: 8.5)
  const rutBoxX = p22Cfg.recuadroInferior?.rut.x ?? p22Cfg.rut?.x ?? 295;
  const rutBoxY = p22Cfg.recuadroInferior?.rut.y ?? p22Cfg.rut?.y ?? 73;
  page22.drawText(formData.rut, {
    x: rutBoxX,
    y: rutBoxY,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  return pdfDoc;
}

/**
 * Inyecta los datos y firma en el Documento 2: Consentimiento Alcohol y Drogas (2 Páginas):
 * - Hoja 1 (Índice 0): Anexo 01 de Minera Centinela, reemplazando dinámicamente '31 de Julio 2026' por la fecha real del IRL.
 * - Hoja 2 (Índice 1): Anexo 02 Consentimiento del Trabajador Colaborador (nombre, rut, fecha real y firma).
 */
export async function fillConsentimiento(
  pdfDoc: PDFDocument,
  formData: WorkerFormData,
  coordinates: CoordinateConfig = DEFAULT_COORDINATES
): Promise<PDFDocument> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Asegurar que el documento conste de dos páginas:
  // Si se pasa un PDF de 1 página (solo Hoja 2), anteponer Hoja 1 (Anexo 01 Minera Centinela)
  if (pdfDoc.getPageCount() === 1) {
    const hoja1Doc = await loadRealConsentimientoHoja1Template();
    const [hoja1Page] = await pdfDoc.copyPages(hoja1Doc, [0]);
    pdfDoc.insertPage(0, hoja1Page);
  }

  const pages = pdfDoc.getPages();
  const pageHoja1 = pages[0];
  const pageHoja2 = pages[1];

  // ---------------------------------------------------------------------------
  // HOJA 1 (Índice 0): Anexo 01 Minera Centinela
  // Reemplazo dinámico de '31 de Julio 2026' por la fecha real del IRL del trabajador
  // ---------------------------------------------------------------------------
  const fechaReal = formData.fecha || STATIC_VALUES.fecha;
  const fechaRealLong = formatDateChileLong(fechaReal);

  // Máscara blanca ajustada con precisión para tapar completamente '31 de Julio 2026'
  // y cualquier carácter o paréntesis residual visible hasta x=246.5, sin invadir
  // los trazos azules de la firma original que inician en x >= 248
  pageHoja1.drawRectangle({
    x: 155,
    y: 282.5,
    width: 91.5,
    height: 11.5,
    color: rgb(1, 1, 1),
  });

  // Tamaño de fuente optimizado y acorde al resto del documento (~8.5 a 8.8 pt)
  // para que se vea perfectamente legible, proporcional y sin superponerse a la firma
  const maxDateWidth = 88;
  let dateFontSize = 8.6;
  while (font.widthOfTextAtSize(fechaRealLong, dateFontSize) > maxDateWidth && dateFontSize > 7.6) {
    dateFontSize -= 0.1;
  }

  // Inyección de la fecha real del IRL con tamaño acorde al resto del documento
  pageHoja1.drawText(fechaRealLong, {
    x: 156,
    y: 284.0,
    size: dateFontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // ---------------------------------------------------------------------------
  // HOJA 2 (Índice 1): Anexo 02 Consentimiento del Trabajador Colaborador
  // ---------------------------------------------------------------------------
  const cfg = coordinates.consentimiento;

  // 1. Párrafo legal superior: "Yo [Nombre], cédula nacional de identidad N° [RUT]"
  pageHoja2.drawText(formData.nombre.toUpperCase(), {
    x: cfg.nombreParrafo?.x ?? 105,
    y: cfg.nombreParrafo?.y ?? 446,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  pageHoja2.drawText(formData.rut, {
    x: cfg.rutParrafo?.x ?? 95,
    y: cfg.rutParrafo?.y ?? 432,
    size: 8.5,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // 2. Tabla de datos inferior
  pageHoja2.drawText(formData.nombre.toUpperCase(), {
    x: cfg.nombre.x,
    y: cfg.nombre.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  pageHoja2.drawText(formData.rut, {
    x: cfg.rut.x,
    y: cfg.rut.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  pageHoja2.drawText(fechaReal, {
    x: cfg.fecha.x,
    y: cfg.fecha.y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // 3. Firma digital manuscrita
  if (formData.firmaPngBase64) {
    const signatureBytes = base64ToUint8Array(formData.firmaPngBase64);
    let signatureImage;
    if (formData.firmaPngBase64.includes('image/jpeg') || formData.firmaPngBase64.includes('image/jpg')) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    } else {
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    }

    pageHoja2.drawImage(signatureImage, {
      x: cfg.firma.x,
      y: cfg.firma.y,
      width: cfg.firma.width,
      height: cfg.firma.height,
    });

    // Subtítulo con Nombre y RUT bajo la firma (Estrictamente color NEGRO)
    pageHoja2.drawText(`${formData.nombre.toUpperCase()} - RUT: ${formData.rut}`, {
      x: cfg.firma.x,
      y: cfg.firma.y - 12,
      size: 7.5,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc;
}

/**
 * Fusiona los dos documentos (Acta DS 44 + Consentimiento) en un único PDF
 */
export async function mergeDocuments(pdf1Bytes: Uint8Array, pdf2Bytes: Uint8Array): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  const doc1 = await PDFDocument.load(pdf1Bytes);
  const doc2 = await PDFDocument.load(pdf2Bytes);

  const copiedPages1 = await mergedPdf.copyPages(doc1, doc1.getPageIndices());
  copiedPages1.forEach((page) => mergedPdf.addPage(page));

  const copiedPages2 = await mergedPdf.copyPages(doc2, doc2.getPageIndices());
  copiedPages2.forEach((page) => mergedPdf.addPage(page));

  return await mergedPdf.save();
}

/**
 * Genera ambos documentos firmados, permitiendo descargas individuales y combinadas
 */
export async function generateSignedDocuments(
  formData: WorkerFormData,
  coordinates: CoordinateConfig = DEFAULT_COORDINATES
): Promise<GeneratedDocumentsResult> {
  // 1. Cargar plantillas
  const ds44Doc = await loadRealDs44Template();
  const consentDoc = await loadRealConsentimientoTemplate();

  // 2. Inyectar datos
  await fillActaDs44(ds44Doc, formData, coordinates);
  await fillConsentimiento(consentDoc, formData, coordinates);

  // 3. Guardar bytes de ambos
  const ds44Bytes = await ds44Doc.save();
  const consentimientoBytes = await consentDoc.save();

  // 4. Fusionar ambos en paquete unificado
  const mergedBytes = await mergeDocuments(ds44Bytes, consentimientoBytes);

  // 5. Crear Blob URLs si estamos en el navegador
  let ds44BlobUrl = '';
  let consentimientoBlobUrl = '';
  let mergedBlobUrl = '';

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
    const ds44Blob = new Blob([new Uint8Array(ds44Bytes)], { type: 'application/pdf' });
    ds44BlobUrl = URL.createObjectURL(ds44Blob);

    const consentBlob = new Blob([new Uint8Array(consentimientoBytes)], { type: 'application/pdf' });
    consentimientoBlobUrl = URL.createObjectURL(consentBlob);

    const mergedBlob = new Blob([new Uint8Array(mergedBytes)], { type: 'application/pdf' });
    mergedBlobUrl = URL.createObjectURL(mergedBlob);
  }

  return {
    ds44BlobUrl,
    ds44Size: ds44Bytes.byteLength,
    consentimientoBlobUrl,
    consentimientoSize: consentimientoBytes.byteLength,
    mergedBlobUrl,
    mergedSize: mergedBytes.byteLength,
    ds44Bytes,
    consentimientoBytes,
    mergedBytes,
  };
}
