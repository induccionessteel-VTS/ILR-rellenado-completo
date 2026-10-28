import React, { useState } from 'react';
import {
  TERMINAL_COMMANDS,
  SUPABASE_SQL_SCRIPT,
  NEXT_ROUTE_HANDLER,
  NEXT_AI_CALIBRATE_ROUTE,
  NEXT_PAGE_TSX,
  NEXT_SUPABASE_CLIENT,
} from '../deliverables/code-strings';
import { Code2, Copy, Check, Terminal, FileCode2, Database, Sparkles, GitBranch, Download, Rocket } from 'lucide-react';

export function NextCodeHub() {
  const [selectedTab, setSelectedTab] = useState<
    'commands' | 'route' | 'ai_route' | 'page' | 'sql' | 'supabase_lib'
  >('route');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'page', title: 'app/page.tsx', label: 'Página Formulario & Descargas', icon: Code2, code: NEXT_PAGE_TSX, filename: 'page.tsx' },
    { id: 'route', title: 'app/api/generate/route.ts', label: 'Endpoint Generación (pdf-lib)', icon: FileCode2, code: NEXT_ROUTE_HANDLER, filename: 'route.ts' },
    { id: 'ai_route', title: 'app/api/ai-calibrate/route.ts', label: 'Endpoint Calibración IA (Gemini)', icon: Sparkles, code: NEXT_AI_CALIBRATE_ROUTE, filename: 'ai-calibrate-route.ts' },
    { id: 'sql', title: 'supabase/schema.sql', label: 'Script SQL Auditoría & Storage', icon: Database, code: SUPABASE_SQL_SCRIPT, filename: 'schema.sql' },
    { id: 'supabase_lib', title: 'lib/supabase.ts', label: 'Cliente Supabase & Storage', icon: FileCode2, code: NEXT_SUPABASE_CLIENT, filename: 'supabase.ts' },
    { id: 'commands', title: 'setup.sh', label: 'Comandos CLI & Setup', icon: Terminal, code: TERMINAL_COMMANDS, filename: 'setup.sh' },
  ];

  const currentTab = tabs.find((t) => t.id === selectedTab) || tabs[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <GitBranch className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">Entregables de Código Next.js (GitHub & Vercel Ready)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Código completo, no resumido y estructurado para vincular directamente a tu repositorio de GitHub y desplegar a producción.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadFile(currentTab.filename, currentTab.code)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Archivo
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(currentTab.code, currentTab.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition"
          >
            {copied === currentTab.id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === currentTab.id ? '¡Copiado!' : 'Copiar Código Completo'}
          </button>
        </div>
      </div>

      {/* Selector de pestañas de archivos */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] opacity-70">({tab.filename})</span>
            </button>
          );
        })}
      </div>

      {/* Editor / Visualizador de Código */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        {/* Barra superior estilo editor */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-slate-400 font-mono text-[11px] ml-2">{currentTab.title}</span>
          </div>

          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            {currentTab.filename.endsWith('.ts') || currentTab.filename.endsWith('.tsx')
              ? 'TypeScript'
              : currentTab.filename.endsWith('.sql')
              ? 'PostgreSQL SQL'
              : 'Shell Script'}
          </span>
        </div>

        {/* Bloque de código con scroll */}
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
          <code>{currentTab.code}</code>
        </pre>
      </div>

      {/* Guía de despliegue en Vercel */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
          <Rocket className="w-4 h-4" />
          <span>Pasos Rápidos de Despliegue en Vercel:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-slate-400 ml-1">
          <li>Crea un repositorio en GitHub (ej: <code>legal-doc-signer</code>) y sube este código.</li>
          <li>En Vercel, selecciona <strong>Add New &gt; Project</strong> e importa el repositorio de GitHub.</li>
          <li>Asegúrate de haber colocado tus dos PDFs originales dentro de <code>public/templates/</code>.</li>
          <li>
            Configura las Variables de Entorno en Vercel: <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, y <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </li>
          <li>Presiona <strong>Deploy</strong>. Vercel compilará automáticamente las rutas API y el formulario en segundos.</li>
        </ol>
      </div>
    </div>
  );
}
