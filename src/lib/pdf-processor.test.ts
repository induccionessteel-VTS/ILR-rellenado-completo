import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  base64ToUint8Array,
  fillActaDs44,
  fillConsentimiento,
  generateSignedDocuments,
  loadRealDs44Template,
  loadRealConsentimientoTemplate,
  mergeDocuments,
} from './pdf-processor';
import { formatRUT, STATIC_VALUES, validateRUT, NORMAS_SEGURIDAD_ITEMS } from './constants';
import { WorkerFormData } from './types';

// PNG mínimo válido 1x1 transparente para pruebas
const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('formatRUT formats clean string with dots and hyphen', () => {
  assert.equal(formatRUT('123456785'), '12.345.678-5');
  assert.equal(formatRUT('12.345.678-5'), '12.345.678-5');
  assert.equal(formatRUT('87654321k'), '87.654.321-K');
});

test('validateRUT validates Chilean check-digit correctly', () => {
  // 12.345.678-5 es válido con algoritmo Módulo 11
  assert.equal(validateRUT('12.345.678-5'), true);
  // RUT con dígito falso
  assert.equal(validateRUT('12.345.678-9'), false);
  // RUT de empresa de ejemplo (Steel Ingeniería: 96.846.410-8)
  assert.equal(validateRUT('96.846.410-8'), true);
});

test('loadRealDs44Template loads the official attached 22-page document VELTS-D-ACN212-HS-0012', async () => {
  const doc = await loadRealDs44Template();
  assert.ok(doc, 'PDFDocument should be defined');
  assert.equal(doc.getPageCount(), 22, 'Official DS 44 document must contain exactly 22 pages');
  const p1 = doc.getPages()[0];
  assert.equal(p1.getWidth(), 612, 'Page width must be 612pt (US Letter)');
  assert.equal(p1.getHeight(), 792, 'Page height must be 792pt (US Letter)');
});

test('loadRealConsentimientoTemplate loads the official Consentimiento document', async () => {
  const doc = await loadRealConsentimientoTemplate();
  assert.ok(doc, 'Consentimiento doc should be defined');
  assert.equal(doc.getPageCount(), 1, 'Consentimiento document must have 1 page');
});

test('fillActaDs44 throws error if PDF has less than 22 pages', async () => {
  const shortDoc = await PDFDocument.create();
  shortDoc.addPage([612, 792]);

  const dummyData: WorkerFormData = {
    nombre: 'TEST',
    rut: '12.345.678-5',
    contactoEmergencia: '',
    telefonoEmergencia: '',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {},
    firmaPngBase64: '',
  };

  await assert.rejects(
    async () => {
      await fillActaDs44(shortDoc, dummyData);
    },
    {
      message: /debe tener al menos 22 páginas/,
    }
  );
});

test('fillActaDs44 populates pages 1, 8, 9, 10-12, 22 and embeds signature', async () => {
  const ds44Doc = await loadRealDs44Template();
  const consentDoc = await loadRealConsentimientoTemplate();

  const formData: WorkerFormData = {
    nombre: 'CARLOS ALBERTO GONZÁLEZ ROJAS',
    rut: '12.345.678-5',
    contactoEmergencia: 'MARCELA ROJAS (Madre)',
    telefonoEmergencia: '+56 9 8765 4321',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {
      enf_epilepsia: false,
      enf_lumbago: false,
      enf_hipertension: true, // Condición declarada
      enf_diabetes: false,
      enf_asma: false,
      enf_claustrofobia: false,
      enf_inmuno: false,
      enf_otras: false,
      ant_fractura: false,
      ant_tratamientos: false,
      cons_alergia: true, // Alergia declarada
      cons_protesis: false,
      cons_ortesis: false,
      cons_discapacidad: false,
      cons_otras: false,
    },
    firmaPngBase64: SAMPLE_PNG_BASE64,
  };

  await fillActaDs44(ds44Doc, formData);
  await fillConsentimiento(consentDoc, formData);

  const ds44Bytes = await ds44Doc.save();
  const consentBytes = await consentDoc.save();

  assert.ok(ds44Bytes.length > 50000, 'DS 44 real PDF bytes should be greater than 50KB');
  assert.ok(consentBytes.length > 1000, 'Consentimiento PDF bytes should be greater than 1KB');

  const mergedBytes = await mergeDocuments(ds44Bytes, consentBytes);
  const reloadedMerged = await PDFDocument.load(mergedBytes);
  assert.equal(reloadedMerged.getPageCount(), 23, 'Merged package must be 22 + 1 = 23 pages');
});

test('generateSignedDocuments produces separate individual documents and combined bundle', async () => {
  const formData: WorkerFormData = {
    nombre: 'JUAN PÉREZ MORALES',
    rut: '12.345.678-5',
    contactoEmergencia: 'MARÍA PÉREZ',
    telefonoEmergencia: '+56 9 1234 5678',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: {},
    firmaPngBase64: SAMPLE_PNG_BASE64,
  };

  const result = await generateSignedDocuments(formData);
  assert.ok(result.ds44Bytes.length > 50000, 'DS 44 should have bytes');
  assert.ok(result.consentimientoBytes.length > 1000, 'Consentimiento should have bytes');
  assert.ok(result.mergedBytes.length > 50000, 'Merged should have bytes');

  const ds44Check = await PDFDocument.load(result.ds44Bytes);
  assert.equal(ds44Check.getPageCount(), 22, 'DS44 has 22 pages');

  const consentCheck = await PDFDocument.load(result.consentimientoBytes);
  assert.equal(consentCheck.getPageCount(), 1, 'Consentimiento has 1 page');

  const mergedCheck = await PDFDocument.load(result.mergedBytes);
  assert.equal(mergedCheck.getPageCount(), 23, 'Merged has 23 pages');
});

test('base64ToUint8Array parses data URL and raw base64 into valid bytes', () => {
  const bytes = base64ToUint8Array(SAMPLE_PNG_BASE64);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes[1], 0x50);
  assert.equal(bytes[2], 0x4e);
  assert.equal(bytes[3], 0x47);
});
