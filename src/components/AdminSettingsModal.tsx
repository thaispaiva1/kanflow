import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  UploadCloud, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw,
  UserPlus,
  Users,
  KeyRound,
  Trash2,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { 
  getSavedSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection, 
  syncLocalToSupabase, 
  purgeMockData 
} from '../services/supabaseService';
import { SUPABASE_SQL_SCHEMA } from '../data/initialData';
import { useAuth, UserRole } from '../context/AuthContext';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged
}) => {
  const { usersList, createUser, deleteUser, quickAdminResetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'supabase' | 'users'>('supabase');

  // Supabase states
  const currentConfig = getSavedSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  // New user form states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('commercial');
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  // Change user password inside admin state
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ username: string; name: string } | null>(null);

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
    if (confirm('Deseja limpar todos os dados fictícios e manter apenas o que você cadastrou?')) {
      purgeMockData();
      setStatusMessage({ type: 'success', text: 'Dados demonstrativos removidos! Mantidos apenas seus cadastros.' });
      onConfigChanged();
    }
  };

  // Create new login
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMessage(null);
    setCreatingUser(true);

    try {
      const res = await createUser({
        username: newUsername,
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole
      });

      if (res.success) {
        setUserActionMessage({ type: 'success', text: res.message });
        setNewUsername('');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');
      } else {
        setUserActionMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setUserActionMessage({ type: 'error', text: err?.message || 'Erro ao criar usuário.' });
    } finally {
      setCreatingUser(false);
    }
  };

  // Delete login
  const handleDeleteUser = (username: string, name: string) => {
    setUserToDelete({ username, name });
  };

  // Quick reset password from admin table
  const handleQuickPasswordUpdate = async (username: string) => {
    if (!quickPassword || quickPassword.length < 4) {
      alert('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    const res = await quickAdminResetPassword(username, quickPassword);
    setUserActionMessage({ type: res.success ? 'success' : 'error', text: res.message });
    setEditingPasswordFor(null);
    setQuickPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Painel do Gerenciador
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Acesso Total
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Gerenciamento do banco de dados Supabase e controle de acessos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Banco de Dados Supabase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gerenciar Logins & E-mails ({usersList.length})</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'supabase' ? (
            /* =================== ABA 1: SUPABASE =================== */
            <div className="space-y-6">
              {/* Status badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${currentConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    Status: {currentConfig.isConnected ? 'Supabase Conectado' : 'Modo Banco Local (Armazenado no Navegador)'}
                  </span>
                </div>

                {currentConfig.isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-rose-600 hover:underline cursor-pointer font-medium"
                  >
                    Desconectar Supabase
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

              {/* Form de Conexão */}
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
                    No painel do Supabase: Project Settings &gt; API &gt; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Supabase Anon / Public API Key
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
                    No painel do Supabase: Project Settings &gt; API &gt; Project API keys (anon / public)
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

              {/* Script SQL */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      Script SQL Completo (Banco & Armazenamento Storage)
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Cole no SQL Editor do Supabase para criar tabelas, ativar RLS e liberar as políticas de anexos/storage
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

                <div className="relative rounded-lg bg-neutral-900 text-neutral-200 p-3 text-[11px] font-mono max-h-32 overflow-y-auto border border-neutral-800">
                  <pre>{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              </div>

              {/* Sincronização & Backup */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={syncing || !currentConfig.isConnected}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{syncing ? 'Sincronizando...' : 'Exportar Leads para o Supabase'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Dados de Exemplo</span>
                </button>
              </div>
            </div>
          ) : (
            /* =================== ABA 2: GERENCIAMENTO DE LOGINS =================== */
            <div className="space-y-6">
              {userActionMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    userActionMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {userActionMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{userActionMessage.text}</span>
                </div>
              )}

              {/* Formulário: Criar Novo Usuário / Login */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold text-xs">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Cadastrar Novo Usuário</span>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Nome Completo do Usuário *
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Carlos Oliveira"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Login / Usuário de Acesso *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Ex: carlos"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        E-mail Pessoal (Para Conferência) *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="carlos@gmail.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Senha Inicial *
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Tipo de Perfil *
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="commercial">Comercial (Cadastra clientes e oportunidades em Prospecção)</option>
                        <option value="employee">Funcionário (Apenas executa/acompanha tarefas)</option>
                        <option value="admin">Administrador / Gerenciador (Nomeia responsáveis e configurações)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{creatingUser ? 'Criando...' : 'Cadastrar Novo Usuário'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Contas Cadastradas */}
              <div>
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-2">
                  Usuários Ativos no Kanflow
                </h4>

                <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase font-semibold text-[11px] border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="py-2.5 px-3">Nome</th>
                        <th className="py-2.5 px-3">Login</th>
                        <th className="py-2.5 px-3">E-mail Cadastrado</th>
                        <th className="py-2.5 px-3">Nível</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {usersList.map((usr) => (
                        <tr key={usr.username} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {usr.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-neutral-600 dark:text-neutral-400">
                            {usr.username}
                          </td>
                          <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                            {usr.email}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              usr.role === 'admin' 
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900' 
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                            }`}>
                              {usr.roleLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {editingPasswordFor === usr.username ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="password"
                                    value={quickPassword}
                                    onChange={(e) => setQuickPassword(e.target.value)}
                                    placeholder="Nova senha"
                                    className="px-2 py-1 text-[11px] rounded border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-neutral-900 w-28"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQuickPasswordUpdate(usr.username)}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold"
                                  >
                                    OK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPasswordFor(null)}
                                    className="px-1.5 py-1 text-neutral-400 text-[10px]"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPasswordFor(usr.username);
                                    setQuickPassword('');
                                  }}
                                  title="Alterar senha do usuário"
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {usr.username !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(usr.username, usr.name)}
                                  title={`Excluir usuário ${usr.name}`}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Exclusão de Usuário */}
        {userToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Excluir Usuário?
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Deseja realmente remover o usuário <strong className="text-neutral-900 dark:text-white">{userToDelete.name}</strong> (<span className="font-mono">{userToDelete.username}</span>)? O acesso dele será revogado permanentemente.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deleteUser(userToDelete.username);
                    setUserActionMessage({ type: res.success ? 'success' : 'error', text: res.message });
                    setUserToDelete(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
                >
                  Sim, Excluir Usuário
                </button>
              </div>
            </div>
          </div>
        )}

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
