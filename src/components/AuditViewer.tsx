import React, { useState } from 'react';
import { AuditoriaDocumento } from '../lib/types';
import { SUPABASE_SQL_SCRIPT } from '../deliverables/code-strings';
import { Database, ShieldCheck, Download, Copy, Check, FileText, Globe, Search, Terminal } from 'lucide-react';

interface Props {
  auditLogs: AuditoriaDocumento[];
  onClearLogs?: () => void;
}

export function AuditViewer({ auditLogs, onClearLogs }: Props) {
  const [activeTab, setActiveTab] = useState<'logs' | 'sql' | 'test'>('logs');
  const [copiedSql, setCopiedSql] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testKey, setTestKey] = useState('');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportCsv = () => {
    if (auditLogs.length === 0) return;
    const headers = ['ID', 'Fecha_Hora', 'Nombre_Trabajador', 'RUT', 'Documentos', 'IP_Address'];
    const rows = auditLogs.map((log) => [
      log.id || 'N/A',
      log.created_at || new Date().toISOString(),
      `"${log.nombre_trabajador}"`,
      log.rut,
      `"${(log.documentos_generados || []).join('; ')}"`,
      log.ip_address,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_documentos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.nombre_trabajador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">Auditoría Masiva & Base de Datos (Supabase)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro legal inmutable de cada documento generado, firma estampada, RUT, timestamp e IP.
          </p>
        </div>

        {/* Pestañas internas */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Registros en Vivo ({auditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'sql' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Script SQL Supabase
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'test' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Configuración y Conexión
          </button>
        </div>
      </div>

      {/* Pestaña: REGISTROS EN VIVO */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Nombre, RUT o IP..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={auditLogs.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
              {onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs rounded-lg border border-slate-700 transition"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Aún no se han generado documentos</p>
              <p className="text-xs text-slate-500 mt-1">
                Completa el formulario en la pestaña principal y genera el PDF para ver el registro aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Trabajador</th>
                    <th className="px-4 py-3">R.U.T.</th>
                    <th className="px-4 py-3">Documentos Generados</th>
                    <th className="px-4 py-3">IP Origen</th>
                    <th className="px-4 py-3 text-center">Estado Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-900/80 transition">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString('es-CL') : 'Ahora'}
                      </td>
                      <td className="px-4 py-3 font-sans font-bold text-white whitespace-nowrap">
                        {log.nombre_trabajador}
                      </td>
                      <td className="px-4 py-3 text-sky-400 font-bold whitespace-nowrap">{log.rut}</td>
                      <td className="px-4 py-3 font-sans text-xs text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {log.documentos_generados?.map((doc, dIdx) => (
                            <span
                              key={dIdx}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-700"
                            >
                              {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{log.ip_address}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Registrado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pestaña: SCRIPT SQL SUPABASE */}
      {activeTab === 'sql' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Ejecuta este script en el <strong>SQL Editor</strong> del panel de tu proyecto en Supabase:
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? '¡SQL Copiado!' : 'Copiar Script SQL'}
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[420px] leading-relaxed">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>
        </div>
      )}

      {/* Pestaña: TEST DE CONEXIÓN */}
      {activeTab === 'test' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Conexión en Producción (Variables de Entorno Next.js)
            </h3>
            <p className="text-xs text-slate-400">
              En tu proyecto desplegado en Vercel, agrega estas variables en <code>Project Settings &gt; Environment Variables</code>:
            </p>

            <div className="space-y-2 text-xs font-mono bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-300">
              <div>
                <span className="text-sky-400 font-bold">NEXT_PUBLIC_SUPABASE_URL</span>=https://xyzcompany.supabase.co
              </div>
              <div>
                <span className="text-sky-400 font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJhbGciOi...
              </div>
              <div>
                <span className="text-emerald-400 font-bold">SUPABASE_SERVICE_ROLE_KEY</span>=eyJhbGciOi... (Recomendado para API Route)
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400 space-y-2">
              <p>
                <strong>¿Por qué Service Role Key en la API Route?</strong>
              </p>
              <p>
                La ruta <code>app/api/generate/route.ts</code> se ejecuta del lado del servidor (Node.js runtime).
                Usar la Service Role Key garantiza que el registro de auditoría se inserte de forma inmutable sin exponer credenciales en el navegador del trabajador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
