import React, { useState, useRef, useMemo } from 'react';
import {
  FileCheck2,
  AlertCircle,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  MapPin,
  FileSignature,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  MEDICAL_QUESTIONS,
  NORMAS_SEGURIDAD_ITEMS,
  STATIC_VALUES,
  formatRUT,
  validateRUT,
} from '../lib/constants';
import { generateSignedDocuments } from '../lib/pdf-processor';
import { AuditoriaDocumento, CoordinateConfig, GeneratedDocumentsResult, WorkerFormData } from '../lib/types';
import { SignatureCanvas, SignatureCanvasHandle } from './SignatureCanvas';

interface Props {
  coordinates: CoordinateConfig;
  onDocumentGenerated: (audit: AuditoriaDocumento, mergedPdfUrl: string) => void;
}

export function WorkerForm({ coordinates, onDocumentGenerated }: Props) {
  const sigRef = useRef<SignatureCanvasHandle | null>(null);

  // Pre-inicializar todas las preguntas médicas explícitamente en `false` para evitar undefined
  const initialMedicalState = useMemo(() => {
    const state: Record<string, boolean> = {};
    for (const q of MEDICAL_QUESTIONS) {
      state[q.id] = false;
    }
    return state;
  }, []);

  const [formData, setFormData] = useState<WorkerFormData>({
    nombre: '',
    rut: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
    cargo: STATIC_VALUES.cargoPage1,
    fecha: STATIC_VALUES.fecha,
    area: STATIC_VALUES.area,
    horaInicio: STATIC_VALUES.horaInicio,
    horaTermino: STATIC_VALUES.horaTermino,
    esPersonaNueva: true,
    respuestasMedicas: initialMedicalState,
    firmaPngBase64: '',
  });

  const [selectedCategory, setSelectedCategory] = useState<'todas' | 'enfermedades' | 'antecedentes' | 'consideraciones'>('todas');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<GeneratedDocumentsResult | null>(null);
  const [rutTouched, setRutTouched] = useState(false);

  const getMedicalAnswer = (id: string): boolean => {
    return Boolean(formData?.respuestasMedicas && formData.respuestasMedicas[id] === true);
  };

  const handleMedicalToggle = (id: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      respuestasMedicas: {
        ...(prev?.respuestasMedicas || {}),
        [id]: value,
      },
    }));
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatRUT(raw);
    setFormData((prev) => ({ ...prev, rut: formatted }));
    setRutTouched(true);
  };

  const loadDemoData = () => {
    setFormData({
      nombre: 'CARLOS ALBERTO GONZÁLEZ ROJAS',
      rut: '12.345.678-5',
      contactoEmergencia: 'MARÍA ROJAS VENEGAS (Madre)',
      telefonoEmergencia: '+56 9 8765 4321',
      cargo: STATIC_VALUES.cargoPage1,
      fecha: STATIC_VALUES.fecha,
      area: STATIC_VALUES.area,
      horaInicio: STATIC_VALUES.horaInicio,
      horaTermino: STATIC_VALUES.horaTermino,
      esPersonaNueva: true,
      respuestasMedicas: {
        ...initialMedicalState,
        enf_hipertension: true,
        cons_alergia: true,
      },
      firmaPngBase64: '',
    });
    setRutTouched(true);
    setErrorMessage(null);
    sigRef.current?.insertSampleSignature();
  };

  const isRutValid = formData.rut.length >= 8 && validateRUT(formData.rut);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setGeneratedResults(null);

    if (!formData.nombre.trim()) {
      setErrorMessage('Por favor ingrese el Nombre Completo del trabajador.');
      return;
    }

    if (!formData.rut.trim() || !validateRUT(formData.rut)) {
      setErrorMessage('El R.U.T. ingresado no es válido. Verifique el número y dígito verificador.');
      return;
    }

    const signature = sigRef.current?.getSignatureDataUrl();
    if (!signature || sigRef.current?.isEmpty()) {
      setErrorMessage(
        'Debe estampar o subir una firma válida que cumpla los criterios legales de legibilidad (hoja blanca limpia y lápiz pasta azul) antes de continuar.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      const dataToProcess: WorkerFormData = {
        ...formData,
        firmaPngBase64: signature,
      };

      // 1. Generar los documentos con pdf-lib (Acta DS 44 + Consentimiento + Fusionado)
      const results = await generateSignedDocuments(dataToProcess, coordinates);
      setGeneratedResults(results);

      // 2. Registrar auditoría legal
      const auditPayload = {
        nombre_trabajador: formData.nombre.toUpperCase(),
        rut: formData.rut,
        cargo: STATIC_VALUES.cargoPage1,
        area: STATIC_VALUES.area,
        documentos_generados: [
          'Acta IRL DS 44 - 22 Páginas (VELTS-D-ACN212-HS-0012.00)',
          'Consentimiento Alcohol y Drogas - 1 Página (CEN-RG-GSS-SGR-004)',
        ],
        metadata: {
          area: STATIC_VALUES.area,
          cargo: STATIC_VALUES.cargoPage1,
          peso_ds44_kb: Math.round(results.ds44Size / 1024),
          peso_consent_kb: Math.round(results.consentimientoSize / 1024),
          total_paginas: 23,
          normas_seguridad_aprobadas: NORMAS_SEGURIDAD_ITEMS.length,
        },
      };

      let auditEntry: AuditoriaDocumento = {
        id: `aud_${Date.now()}`,
        created_at: new Date().toISOString(),
        nombre_trabajador: auditPayload.nombre_trabajador,
        rut: auditPayload.rut,
        cargo: auditPayload.cargo,
        area: auditPayload.area,
        documentos_generados: auditPayload.documentos_generados,
        ip_address: '192.168.1.105 (Cliente Local / Minera)',
        user_agent: navigator.userAgent,
        metadata: auditPayload.metadata,
      };

      try {
        const auditRes = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditPayload),
        });
        if (auditRes.ok) {
          const resJson = await auditRes.json();
          if (resJson.record) {
            auditEntry = resJson.record;
          }
        }
      } catch {
        // En caso de que el backend no responda, mantenemos el registro local
      }

      onDocumentGenerated(auditEntry, results.mergedBlobUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Error al procesar y firmar PDFs: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredQuestions =
    selectedCategory === 'todas'
      ? MEDICAL_QUESTIONS
      : MEDICAL_QUESTIONS.filter((q) => q.category === selectedCategory);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Barra superior con botón demo */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-sky-400" />
            Llenado y Firma Digital de Documentación Laboral
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatización de Acta IRL D.S. N° 44 (22 págs) y Consentimiento de Alcohol y Drogas para Faena Concentraducto.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDemoData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Cargar Datos de Prueba (Demo)
        </button>
      </div>

      {/* SECCIÓN 1: DATOS PERSONALES DEL TRABAJADOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
              1
            </span>
            <h3 className="text-sm font-bold text-white">Datos del Trabajador (Dinámicos)</h3>
          </div>
          <span className="text-[11px] text-slate-400">Pág. 1, Pág. 22 y Consentimiento</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Completo del Trabajador <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: JUAN CARLOS PÉREZ SOTO"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>R.U.T. Chileno <span className="text-red-400">*</span></span>
              {rutTouched && (
                <span className={`text-[10px] font-bold ${isRutValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isRutValid ? '✓ RUT Válido' : '✕ RUT Inválido'}
                </span>
              )}
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 12.345.678-5"
              value={formData.rut}
              onChange={handleRutChange}
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none ${
                rutTouched
                  ? isRutValid
                    ? 'border-emerald-500/70 focus:border-emerald-500'
                    : 'border-red-500/70 focus:border-red-500'
                  : 'border-slate-700 focus:border-sky-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre Contacto de Emergencia
            </label>
            <input
              type="text"
              placeholder="Ej: MARÍA ROJAS VENEGAS (Madre / Cónyuge)"
              value={formData.contactoEmergencia}
              onChange={(e) => setFormData({ ...formData, contactoEmergencia: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Teléfono Contacto de Emergencia
            </label>
            <input
              type="tel"
              placeholder="+56 9 8765 4321"
              value={formData.telefonoEmergencia}
              onChange={(e) => setFormData({ ...formData, telefonoEmergencia: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: DATOS OPERACIONALES AUTOCOMPLETADOS (ESTÁTICOS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
              2
            </span>
            <h3 className="text-sm font-bold text-white">Parámetros Operacionales Estáticos (Inyectados por Regla)</h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
            Autocompletado Automático
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              <span>Cargo Pág. 1 / 22:</span>
            </div>
            <div className="font-bold text-white">{STATIC_VALUES.cargoPage1}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fecha Registro:</span>
            </div>
            <div className="font-bold text-white font-mono">{STATIC_VALUES.fecha}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Área / Faena:</span>
            </div>
            <div className="font-bold text-white">{STATIC_VALUES.area}</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Horario Inducción:</span>
            </div>
            <div className="font-bold text-white font-mono">
              {STATIC_VALUES.horaInicio} a {STATIC_VALUES.horaTermino}
            </div>
          </div>
        </div>

        {/* Notificación de X gigante y normas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/40 p-3 rounded-xl text-xs text-red-200">
            <span className="text-xl font-black text-red-400 font-mono">❌</span>
            <div>
              <strong className="text-red-300">Regla Acta DS 44 (Pág. 1):</strong> Casilla{' '}
              <strong>"Persona Nueva"</strong> marcada con "X" en (x: {coordinates.actaDs44.page1.personaNuevaX.x}, y: {coordinates.actaDs44.page1.personaNuevaX.y}).
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl text-xs text-blue-200">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <strong className="text-blue-300">Regla Páginas 10, 11 y 12:</strong> Los 13 módulos de{' '}
              <strong>Normas Generales de Seguridad</strong> se marcan automáticamente con "X".
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: CUESTIONARIO MÉDICO DS 44 (PÁGINAS 8 Y 9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold">
              3
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Cuestionario Médico de Salud (Páginas 8 y 9)</h3>
              <p className="text-[11px] text-slate-400">
                Cada respuesta inyecta una 'X' calibrada en las casillas SI/NO de la Ficha Médica oficial.
              </p>
            </div>
          </div>

          {/* Filtro por categoría */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedCategory('todas')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'todas' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (15)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('enfermedades')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'enfermedades' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enfermedades (01-08)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('antecedentes')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'antecedentes' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Antecedentes (08-09)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('consideraciones')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                selectedCategory === 'consideraciones' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Otras (11-15)
            </button>
          </div>
        </div>

        {/* Lista de preguntas con botones SÍ / NO */}
        <div className="space-y-2.5">
          {filteredQuestions.map((q) => {
            const isYes = getMedicalAnswer(q.id);
            return (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800/60">
                      Pág. {q.pageIndex + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-200">{q.question}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMedicalToggle(q.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isYes
                        ? 'bg-red-600 text-white shadow ring-2 ring-red-400/50'
                        : 'bg-slate-800/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    SÍ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMedicalToggle(q.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      !isYes
                        ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400/50'
                        : 'bg-slate-800/90 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 4: PAD DE FIRMA DIGITAL MANUSCRITA Y SUBIDA DE FOTO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold">
              4
            </span>
            <h3 className="text-sm font-bold text-white">Captura de Firma Digital (Trazado o Foto)</h3>
          </div>
          <span className="text-[11px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
            Incrustación en DS 44 (Pág. 22) y Consentimiento
          </span>
        </div>

        <SignatureCanvas ref={sigRef} height={190} />
      </div>

      {/* Mensajes de Alerta */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/80 border border-red-700 text-sm text-red-200 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECCIÓN DE DESCARGAS INDIVIDUALES (PAQUETE COMPLETO ELIMINADO) */}
      {generatedResults && (
        <div className="p-6 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-base font-bold text-white">¡Documentos Generados y Calibrados con Éxito!</h4>
              <p className="text-xs text-slate-400">
                Los documentos han sido generados y están listos para su descarga individual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {/* Opción 1: Descargar Acta DS 44 por separado */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Documento 1 (22 Páginas)</span>
                </div>
                <div className="font-semibold text-white text-sm">Acta IRL D.S. N° 44</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  VELTS-D-ACN212-HS-0012 • Ficha médica & 13 normas con X ({Math.round(generatedResults.ds44Size / 1024)} KB)
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={generatedResults.ds44BlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </a>
                <a
                  href={generatedResults.ds44BlobUrl}
                  download={`Acta_IRL_DS44_${formData.rut.replace(/[^0-9kK]/g, '')}.pdf`}
                  className="flex-1 py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar DS 44
                </a>
              </div>
            </div>

            {/* Opción 2: Descargar Consentimiento por separado */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Documento 2 (1 Página)</span>
                </div>
                <div className="font-semibold text-white text-sm">Consentimiento Alcohol/Drogas</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  CEN-RG-GSS-SGR-004 • Párrafo legal completo & firma ({Math.round(generatedResults.consentimientoSize / 1024)} KB)
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={generatedResults.consentimientoBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver
                </a>
                <a
                  href={generatedResults.consentimientoBlobUrl}
                  download={`Consentimiento_Alcohol_Drogas_${formData.rut.replace(/[^0-9kK]/g, '')}.pdf`}
                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Consentimiento
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN PRINCIPAL DE GENERACIÓN Y FIRMA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generando PDFs con pdf-lib y auditando en Supabase...</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-5 h-5" />
              <span>Generar y Firmar Documentos Individuales</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}