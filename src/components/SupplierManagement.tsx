import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Supplier } from '../types/crm';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  User, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Filter,
  Download,
  Check,
  X
} from 'lucide-react';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const { isCommercial, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // CNPJ / CPF mask helper
  const formatDocument = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 11) {
      if (raw.length <= 3) return raw;
      if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
      if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
      return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    } else {
      const trimmed = raw.slice(0, 14);
      if (trimmed.length <= 2) return trimmed;
      if (trimmed.length <= 5) return `${trimmed.slice(0, 2)}.${trimmed.slice(2)}`;
      if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}.${trimmed.slice(2, 5)}.${trimmed.slice(5)}`;
      if (trimmed.length <= 12) return `${trimmed.slice(0, 2)}.${trimmed.slice(2, 5)}.${trimmed.slice(5, 8)}/${trimmed.slice(8)}`;
      return `${trimmed.slice(0, 2)}.${trimmed.slice(2, 5)}.${trimmed.slice(5, 8)}/${trimmed.slice(8, 12)}-${trimmed.slice(12, 14)}`;
    }
  };

  // Phone mask helper
  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw.length ? `(${raw}` : '';
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [suppliers]);

  // Filtered companies/clients
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cnpj.includes(searchTerm) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm);

      const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [suppliers, searchTerm, categoryFilter, statusFilter]);

  const handleOpenNew = () => {
    if (!isCommercial) {
      alert('Apenas usuários com perfil Comercial têm permissão para cadastrar novas empresas/clientes.');
      return;
    }
    setSupplierToEdit(null);
    setName('');
    setCnpj('');
    setEmail('');
    setContactName('');
    setPhone('');
    setCategory('Tecnologia');
    setNotes('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setName(supplier.name);
    setCnpj(supplier.cnpj);
    setEmail(supplier.email);
    setContactName(supplier.contact_name);
    setPhone(supplier.phone);
    setCategory(supplier.category || 'Geral');
    setNotes(supplier.notes || '');
    setStatus(supplier.status);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierToEdit && !isCommercial) {
      alert('Apenas usuários com perfil Comercial têm permissão para cadastrar novas empresas/clientes.');
      return;
    }
    if (!name.trim() || !cnpj.trim() || !email.trim() || !contactName.trim() || !phone.trim()) {
      alert('Preencha os campos obrigatórios: Nome/Razão Social, CNPJ/CPF, E-mail, Contato e Telefone.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (supplierToEdit) {
        await onUpdateSupplier(supplierToEdit.id, {
          name: name.trim(),
          cnpj: cnpj.trim(),
          email: email.trim().toLowerCase(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          category: category.trim() || 'Geral',
          notes: notes.trim(),
          status
        });
      } else {
        await onAddSupplier({
          name: name.trim(),
          cnpj: cnpj.trim(),
          email: email.trim().toLowerCase(),
          contact_name: contactName.trim(),
          phone: phone.trim(),
          category: category.trim() || 'Geral',
          notes: notes.trim(),
          status
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar empresa / cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover a empresa/cliente "${name}"?`)) {
      await onDeleteSupplier(id);
    }
  };

  // Export CSV
  const handleExportSuppliersCSV = () => {
    const headers = ['ID', 'Empresa_Cliente', 'CNPJ_CPF', 'Email', 'Contato_Responsavel', 'Telefone', 'Segmento', 'Status', 'Observacoes', 'Cadastrado_Em'];
    const rows = filteredSuppliers.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.cnpj}"`,
      `"${s.email}"`,
      `"${s.contact_name.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${(s.category || 'Geral').replace(/"/g, '""')}"`,
      s.status === 'active' ? 'Ativo' : 'Inativo',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      s.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kanflow_empresas_clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <span>Cadastro e Gestão de Empresas / Clientes</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {filteredSuppliers.length} {filteredSuppliers.length === 1 ? 'empresa/cliente' : 'empresas/clientes'}
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Central de contas e clientes: controle de CNPJ/CPF, e-mail comercial, contato e telefone/WhatsApp
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSuppliersCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs"
            title="Exportar empresas e clientes para CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {isCommercial ? (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa / Cliente</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <span>Cadastro exclusivo do Comercial</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da empresa, CNPJ/CPF, e-mail, contato ou telefone..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Segmentos</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Somente Ativos</option>
            <option value="inactive">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* Companies/Clients Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-3">
            <Building2 className="w-10 h-10 stroke-1 text-neutral-300 dark:text-neutral-600" />
            <span className="text-sm font-medium">Nenhuma empresa ou cliente cadastrado(a) com os filtros atuais.</span>
            {isCommercial ? (
              <button
                onClick={handleOpenNew}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                + Cadastrar empresa / cliente agora
              </button>
            ) : (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                (Cadastros de novos clientes são realizados pelo perfil Comercial)
              </span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Empresa / Cliente</th>
                  <th className="py-3.5 px-4">CNPJ / CPF</th>
                  <th className="py-3.5 px-4">Contato & Telefone</th>
                  <th className="py-3.5 px-4">E-mail Comercial</th>
                  <th className="py-3.5 px-4">Segmento</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                {filteredSuppliers.map((supplier) => (
                  <tr 
                    key={supplier.id}
                    className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Name & Notes */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-neutral-900 dark:text-white block truncate">
                            {supplier.name}
                          </span>
                          {supplier.notes && (
                            <span className="text-[11px] text-neutral-400 truncate block max-w-xs" title={supplier.notes}>
                              {supplier.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CNPJ / CPF */}
                    <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                      {supplier.cnpj}
                    </td>

                    {/* Contato & Telefone */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="text-neutral-900 dark:text-neutral-100 font-semibold block flex items-center gap-1.5">
                          <User className="w-3 h-3 text-neutral-400" />
                          <span>{supplier.contact_name}</span>
                        </span>
                        <a 
                          href={`tel:${supplier.phone.replace(/\D/g, '')}`} 
                          className="text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 font-mono text-[11px]"
                        >
                          <Phone className="w-3 h-3 text-neutral-400" />
                          <span>{supplier.phone}</span>
                        </a>
                      </div>
                    </td>

                    {/* E-mail */}
                    <td className="py-3.5 px-4">
                      <a 
                        href={`mailto:${supplier.email}`}
                        className="text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 truncate max-w-[200px]"
                        title={supplier.email}
                      >
                        <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </a>
                    </td>

                    {/* Segmento */}
                    <td className="py-3.5 px-4">
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {supplier.category || 'Geral'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        supplier.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${supplier.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                        <span>{supplier.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(supplier)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Editar empresa / cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remover cadastro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Cadastro / Edição de Empresa / Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div 
            className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {supplierToEdit ? 'Editar Empresa / Cliente' : 'Cadastrar Nova Empresa / Cliente'}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome / Razão Social */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Razão Social / Nome da Empresa ou Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Comercial Souza Ltda"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* CNPJ / CPF */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    CNPJ / CPF *
                  </label>
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(formatDocument(e.target.value))}
                    placeholder="00.000.000/0000-00 ou CPF"
                    maxLength={18}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    E-mail de Contato *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Contato (Pessoa / Responsável) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nome do Contato / Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex: Roberto Silva"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Telefone Comercial / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    maxLength={15}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Segmento */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Segmento / Ramo de Atuação
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Varejo, Tecnologia, Serviços, Indústria"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Status Cadastral
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Observações / Condições Comerciais
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Insira detalhes sobre histórico, negociações ou particularidades..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{formSubmitting ? 'Salvando...' : supplierToEdit ? 'Atualizar Empresa/Cliente' : 'Cadastrar Empresa/Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
