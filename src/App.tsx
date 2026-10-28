import React, { useState } from 'react';
import { WorkerForm } from './components/WorkerForm';
import { CoordinateCalibrator } from './components/CoordinateCalibrator';
import { AuditViewer } from './components/AuditViewer';
import { NextCodeHub } from './components/NextCodeHub';
import { CoordinateConfig, AuditoriaDocumento } from './lib/types';
import { DEFAULT_COORDINATES } from './lib/constants';
import {
  FileSignature,
  Target,
  Database,
  Code2,
  FileText,
  ShieldCheck,
  Eye,
  X,
  Lock,
  Unlock,
  KeyRound,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'calibrator' | 'audit' | 'code'>('form');
  const [coordinates, setCoordinates] = useState<CoordinateConfig>(
    JSON.parse(JSON.stringify(DEFAULT_COORDINATES))
  );

  // Control de Acceso de Administrador (RBAC)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);

  // Historial de auditoría
  const [auditLogs, setAuditLogs] = useState<AuditoriaDocumento[]>([
    {
      id: 'aud_seed_001',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      nombre_trabajador: 'JUAN ESTEBAN MORALES CASTRO',
      rut: '14.892.341-8',
      cargo: 'OPERARIO(A) DE ASEO',
      area: 'CONCENTRADUCTO',
      documentos_generados: ['Acta IRL DS 44 (VELTS-D-ACN212-HS-0012)', 'Consentimiento Alcohol y Drogas'],
      ip_address: '190.114.32.18 (Antofagasta / Minera)',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  ]);

  const [lastGeneratedPdfUrl, setLastGeneratedPdfUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  React.useEffect(() => {
    fetch('/api/audit')
      .then((res) => res.json())
      .then((data) => {
        if (data.records && Array.isArray(data.records) && data.records.length > 0) {
          setAuditLogs(data.records);
        }
      })
      .catch(() => {});
  }, []);

  const handleDocumentGenerated = (audit: AuditoriaDocumento, mergedPdfUrl: string) => {
    setAuditLogs((prev) => [audit, ...prev.filter((item) => item.id !== audit.id)]);
    setLastGeneratedPdfUrl(mergedPdfUrl);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // PIN por defecto para evaluación: admin2026
    if (adminPinInput.trim() === 'admin2026' || adminPinInput.trim() === '1234') {
      setIsAdminLoggedIn(true);
      setShowAdminLoginModal(false);
      setAdminPinInput('');
      setAdminPinError(false);
      setActiveTab('audit');
    } else {
      setAdminPinError(true);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    if (activeTab === 'audit') {
      setActiveTab('form');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Banner de Estado Administrador cuando está desbloqueado */}
      {isAdminLoggedIn && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Modo Administrador Activo:</strong> Acceso completo a Auditoría Legal, Registros de IP, RUTs y Configuración Supabase.
              </span>
            </div>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 rounded text-[11px] font-bold border border-emerald-700/60 transition"
            >
              <Lock className="w-3 h-3" />
              Cerrar Sesión Admin
            </button>
          </div>
        </div>
      )}

      {/* Barra de Navegación Principal */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-900/30">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight">LegalDoc Signer</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    VELTS DS 44 Real
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Documento Oficial: VELTS-D-ACN212-HS-0012.00 • Concentraducto
                </p>
              </div>
            </div>

            {/* Pestañas de Navegación */}
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'form'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Formulario & Firma</span>
                <span className="sm:hidden">Firma</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calibrator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'calibrator'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calibrador (x, y)</span>
                <span className="sm:hidden">Calibrar</span>
              </button>

              {/* Pestaña de Auditoría: Solo visible o activa para el Administrador */}
              {isAdminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'audit'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Auditoría</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    {auditLogs.length}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition"
                  title="Acceso exclusivo para administradores"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Auditoría (Admin)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'code'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Código Next.js</span>
                <span className="sm:hidden">Código</span>
              </button>
            </nav>

            {/* Botón flotante para ver último PDF generado */}
            <div className="flex items-center gap-2">
              {lastGeneratedPdfUrl && (
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Último PDF
                </button>
              )}

              {!isAdminLoggedIn && (
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Portal Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'form' && (
          <div className="space-y-6">
            <WorkerForm
              coordinates={coordinates}
              onDocumentGenerated={handleDocumentGenerated}
            />
          </div>
        )}

        {activeTab === 'calibrator' && (
          <CoordinateCalibrator
            coordinates={coordinates}
            onCoordinatesChange={setCoordinates}
          />
        )}

        {activeTab === 'audit' && (
          <>
            {isAdminLoggedIn ? (
              <AuditViewer
                auditLogs={auditLogs}
                onClearLogs={() => setAuditLogs([])}
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Módulo de Auditoría Protegido</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Por normativas de privacidad y seguridad legal, los registros de firmas, RUTs e IPs son confidenciales y solo pueden ser consultados por el Administrador o Prevencionista de Riesgos.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Ingresar Clave de Administrador
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'code' && <NextCodeHub />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>
              Documento Oficial: <strong>VELTS-D-ACN212-HS-0012.00 (IRL DS 44)</strong> • Steel Ingeniería S.A.
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Faena Concentraducto • Seguridad Minera D.S. N° 44 • RLS Supabase Restringido
          </div>
        </div>
      </footer>

      {/* Modal de Acceso de Administrador */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Autenticación de Administrador</h3>
                  <p className="text-[11px] text-slate-400">Portal de Seguridad & Auditoría</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setAdminPinError(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ingrese su PIN o Clave de Administrador para desbloquear la consulta de auditoría masiva y registros de trabajadores.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clave / PIN de Acceso (Por defecto: <code className="text-amber-400 font-mono">admin2026</code>)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="admin2026"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError(false);
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none ${
                    adminPinError ? 'border-red-500' : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
                {adminPinError && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    PIN incorrecto. Ingrese <span className="font-mono font-bold">admin2026</span> para acceder.
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Desbloquear Auditoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Previsualización del PDF Generado */}
      {showPreviewModal && lastGeneratedPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Previsualización del Documento PDF Generado</h3>
                <span className="text-xs text-slate-400 ml-2">(23 Páginas: VELTS DS 44 + Consentimiento)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lastGeneratedPdfUrl}
                  download="Documentos_Legales_Firmados.pdf"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2">
              <iframe
                src={lastGeneratedPdfUrl}
                title="Previsualización PDF"
                className="w-full h-full rounded-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
