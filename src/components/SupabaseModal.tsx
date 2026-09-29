import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw 
} from 'lucide-react';
import { 
  getSavedSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  syncLocalToSupabase, 
  resetToDemoData 
} from '../services/supabaseService';
import { SUPABASE_SQL_SCHEMA } from '../data/initialData';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged
}) => {
  const currentConfig = getSavedSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage({ type: 'error', text: 'Preencha a URL e a Anon Key do seu projeto Supabase.' });
      return;
    }

    setTesting(true);
    setStatusMessage({ type: 'info', text: 'Testando conexão com o Supabase...' });

    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTesting(false);

    if (result.success) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      setStatusMessage({ type: 'success', text: result.message });
      onConfigChanged();
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleDisconnect = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setAnonKey('');
    setStatusMessage({ type: 'info', text: 'Supabase desconectado. O sistema está operando com banco local persistente.' });
    onConfigChanged();
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setStatusMessage({ type: 'info', text: 'Sincronizando negócios para o Supabase...' });
    const res = await syncLocalToSupabase();
    setSyncing(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `${res.count} oportunidades enviadas com sucesso para o banco Supabase!` });
      onConfigChanged();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Erro ao sincronizar com o Supabase.' });
    }
  };

  const handleResetDemo = () => {
    if (confirm('Deseja restaurar as oportunidades de demonstração padrão?')) {
      resetToDemoData();
      setStatusMessage({ type: 'success', text: 'Dados de demonstração restaurados com sucesso!' });
      onConfigChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Integração Supabase • Kanflow
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Conecte seu banco de dados Postgres no Supabase para persistência na nuvem
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Status badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${currentConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Status: {currentConfig.isConnected ? 'Supabase Conectado' : 'Modo Banco Local (LocalStorage Ativo)'}
              </span>
            </div>

            {currentConfig.isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Desconectar
              </button>
            )}
          </div>

          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Connection Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefg.supabase.co"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Encontrado em: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Encontrado em: Supabase Dashboard &gt; Project Settings &gt; API &gt; anon public API key
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testando Conexão...' : 'Testar & Conectar Supabase'}</span>
              </button>
            </div>
          </form>

          {/* Step 2: SQL DDL Schema */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  Script SQL de Criação das Tabelas
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Cole este script no SQL Editor do Supabase para criar as tabelas `deals` e `deal_activities`
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySQL}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="relative rounded-lg bg-neutral-900 text-neutral-200 p-3 text-[11px] font-mono max-h-36 overflow-y-auto border border-neutral-800">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>

          {/* Sync & Backup Actions */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSyncToSupabase}
              disabled={syncing || !currentConfig.isConnected}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{syncing ? 'Sincronizando...' : 'Exportar Leads Locais para o Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Leads Demo</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
