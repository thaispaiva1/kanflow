import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Deal, DealActivity, DealAttachment, DealPriority, DealSource, FunnelStage, Supplier } from '../types/crm';
import { LOSS_REASONS } from '../data/initialData';
import { formatCurrencyBRL } from '../services/supabaseService';
import { 
  X, 
  Trash2, 
  Check, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Plus, 
  Clock, 
  Send,
  Paperclip,
  UploadCloud,
  Download,
  FileText,
  File,
  FileSpreadsheet,
  Image,
  ExternalLink,
  Eye
} from 'lucide-react';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealToEdit?: Deal | null;
  stages: FunnelStage[];
  onSave: (dealData: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAddActivity?: (dealId: string, activity: Omit<DealActivity, 'id' | 'deal_id' | 'created_at'>) => Promise<void>;
  initialStageId?: string;
  companies?: Supplier[];
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string, name: string) {
  const lowerName = (name || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();

  if (lowerType.startsWith('image/') || lowerName.match(/\.(png|jpe?g|webp|gif|svg)$/)) {
    return <Image className="w-5 h-5 text-emerald-500" />;
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (lowerType.includes('sheet') || lowerType.includes('excel') || lowerType.includes('csv') || lowerName.match(/\.(xlsx?|csv)$/)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (lowerType.includes('word') || lowerName.match(/\.(docx?|odt|txt)$/)) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  return <File className="w-5 h-5 text-indigo-500" />;
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  dealToEdit,
  stages,
  onSave,
  onDelete,
  onAddActivity,
  initialStageId,
  companies = []
}) => {
  const isEditing = !!dealToEdit;
  const { user, isAdmin, usersList } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'activities'>('details');

  // Form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [value, setValue] = useState<number>(0);
  const [stageId, setStageId] = useState('prospecting');
  const [priority, setPriority] = useState<DealPriority>('medium');
  const [source, setSource] = useState<DealSource>('Inbound Site');
  const [owner, setOwner] = useState('Thais Paiva');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<DealAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [autoFillFeedback, setAutoFillFeedback] = useState<string | null>(null);

  // New activity form
  const [activityType, setActivityType] = useState<'call' | 'meeting' | 'note' | 'whatsapp'>('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  useEffect(() => {
    if (dealToEdit) {
      setTitle(dealToEdit.title);
      setCompany(dealToEdit.company);
      const matched = (companies || []).find(
        c => c.name.trim().toLowerCase() === (dealToEdit.company || '').trim().toLowerCase()
      );
      if (matched) {
        setContactName(matched.contact_name || '');
        setContactEmail(matched.email || '');
        setContactPhone(matched.phone || '');
        setAutoFillFeedback(matched.name);
      } else {
        setContactName(dealToEdit.contact_name || '');
        setContactEmail(dealToEdit.contact_email || '');
        setContactPhone(dealToEdit.contact_phone || '');
        setAutoFillFeedback(null);
      }
      setValue(dealToEdit.value || 0);
      setStageId(dealToEdit.stage_id);
      setPriority(dealToEdit.priority || 'medium');
      setSource(dealToEdit.source || 'Inbound Site');
      
      // Apagar históricos de nomes fictícios/antigos e manter SOMENTE os usuários cadastrados
      const registeredNames = (usersList || []).map(u => u.name).filter(Boolean);
      const isOwnerRegistered = dealToEdit.owner && registeredNames.includes(dealToEdit.owner);
      const safeOwner = isOwnerRegistered 
        ? dealToEdit.owner 
        : (registeredNames[0] || user?.name || 'Administrador');
      setOwner(safeOwner);

      setExpectedCloseDate(dealToEdit.expected_close_date || '');
      setNotes(dealToEdit.notes || '');
      setLossReason(dealToEdit.loss_reason || '');
      setTags(dealToEdit.tags || []);
      setAttachments(dealToEdit.attachments || []);
    } else {
      // New deal default
      setTitle('');
      setCompany('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setValue(15000);
      setStageId(initialStageId || 'prospecting');
      setPriority('medium');
      setSource('Inbound Site');
      const registeredNames = (usersList || []).map(u => u.name).filter(Boolean);
      setOwner(registeredNames[0] || user?.name || 'Administrador');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setExpectedCloseDate(defaultDate.toISOString().split('T')[0]);
      setNotes('');
      setLossReason('');
      setTags(['Novo Lead']);
      setAttachments([]);
      setAutoFillFeedback(null);
    }
    setActiveTab('details');
  }, [dealToEdit, initialStageId, isOpen, companies, usersList, user?.name]);

  // Check if current company matches a registered client
  const matchedClient = useMemo(() => {
    if (!company.trim()) return null;
    return (companies || []).find(
      c => c.name.trim().toLowerCase() === company.trim().toLowerCase()
    ) || null;
  }, [companies, company]);

  const isContactLocked = !!matchedClient;

  // List of all eligible team members/responsibles (EXCLUSIVAMENTE USUÁRIOS CADASTRADOS)
  const assignableUsers = useMemo(() => {
    const list: string[] = [];
    (usersList || []).forEach(u => {
      if (u.name && !list.includes(u.name)) {
        list.push(u.name);
      }
    });
    // Se a lista estiver vazia por contingência, usar o usuário conectado
    if (list.length === 0 && user?.name) {
      list.push(user.name);
    }
    return list;
  }, [usersList, user?.name]);

  if (!isOpen) return null;

  const handleCompanyChange = (val: string) => {
    setCompany(val);
    const matched = (companies || []).find(
      c => c.name.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setContactName(matched.contact_name || '');
      setContactEmail(matched.email || '');
      setContactPhone(matched.phone || '');
      setAutoFillFeedback(matched.name);
    } else {
      setAutoFillFeedback(null);
    }
  };

  const handleSelectRegisteredCompany = (compName: string) => {
    if (!compName) return;
    const matched = (companies || []).find(c => c.name === compName);
    if (matched) {
      setCompany(matched.name);
      setContactName(matched.contact_name || '');
      setContactEmail(matched.email || '');
      setContactPhone(matched.phone || '');
      setAutoFillFeedback(matched.name);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Upload handler for files
  const processFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAttachment: DealAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
          created_at: new Date().toISOString(),
          uploaded_by: user?.name || owner || 'Thais Paiva'
        };
        setAttachments(prev => [newAttachment, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const handleDownloadAttachment = (att: DealAttachment) => {
    const link = document.createElement('a');
    link.href = att.url;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalContactName = isContactLocked && matchedClient ? matchedClient.contact_name : contactName;
      const finalContactEmail = isContactLocked && matchedClient ? matchedClient.email : contactEmail;
      const finalContactPhone = isContactLocked && matchedClient ? matchedClient.phone : contactPhone;
      
      const registeredNames = assignableUsers;
      const validOwner = registeredNames.includes(owner) ? owner : (registeredNames[0] || user?.name || 'Administrador');
      const finalOwner = isAdmin 
        ? validOwner 
        : (dealToEdit?.owner && registeredNames.includes(dealToEdit.owner) ? dealToEdit.owner : validOwner);
      const finalStageId = isEditing ? stageId : 'prospecting';

      await onSave({
        title,
        company,
        contact_name: finalContactName,
        contact_email: finalContactEmail,
        contact_phone: finalContactPhone,
        value: Number(value) || 0,
        stage_id: finalStageId,
        priority,
        source,
        owner: finalOwner,
        expected_close_date: expectedCloseDate,
        notes,
        loss_reason: stageId === 'lost' ? lossReason : undefined,
        tags,
        attachments
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityDesc.trim() || !dealToEdit || !onAddActivity) return;
    setAddingActivity(true);
    try {
      await onAddActivity(dealToEdit.id, {
        type: activityType,
        description: activityDesc.trim(),
        created_by: owner || user?.name || 'Thais Paiva'
      });
      setActivityDesc('');
    } catch (e) {
      console.error(e);
    } finally {
      setAddingActivity(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isEditing ? 'Editar Oportunidade / Tarefa' : 'Nova Oportunidade / Tarefa'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isEditing ? `ID: ${dealToEdit.id}` : 'Preencha os dados e adicione anexos conforme necessário'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex items-center px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            Dados da Oportunidade
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attachments'
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Anexos</span>
            {attachments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                {attachments.length}
              </span>
            )}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'activities'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Histórico & Atividades ({dealToEdit.activities?.length || 0})</span>
            </button>
          )}
        </div>

        {/* Hidden global file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Modal Body */}
        {activeTab === 'details' ? (
          /* ========================================================= */
          /* ABA 1: DADOS DA OPORTUNIDADE                              */
          /* ========================================================= */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Title & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Título da Oportunidade / Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Licença Software ERP"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Empresa / Cliente *
                  </label>
                  {companies && companies.length > 0 && (
                    <select
                      onChange={(e) => {
                        handleSelectRegisteredCompany(e.target.value);
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-transparent border-none focus:outline-none cursor-pointer hover:underline"
                      title="Selecionar empresa cadastrada para preencher contato automaticamente"
                    >
                      <option value="" disabled>Selecionar cadastrada...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  required
                  list="registered-companies-list"
                  value={company}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  placeholder="Ex: Comercial Souza Ltda (digite ou selecione)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="registered-companies-list">
                  {companies.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.contact_name ? `${c.name} • Contato: ${c.contact_name}` : c.name}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Contacts: Name, Email, Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  readOnly={isContactLocked}
                  tabIndex={isContactLocked ? -1 : 0}
                  value={contactName}
                  onChange={isContactLocked ? undefined : (e) => setContactName(e.target.value)}
                  placeholder={isContactLocked ? "Nome do contato do cliente" : "Ex: Roberto Silva"}
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                    isContactLocked
                      ? "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 cursor-not-allowed select-none"
                      : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  E-mail do Contato
                </label>
                <input
                  type="email"
                  readOnly={isContactLocked}
                  tabIndex={isContactLocked ? -1 : 0}
                  value={contactEmail}
                  onChange={isContactLocked ? undefined : (e) => setContactEmail(e.target.value)}
                  placeholder={isContactLocked ? "E-mail do contato do cliente" : "roberto@empresa.com"}
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                    isContactLocked
                      ? "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 cursor-not-allowed select-none"
                      : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  readOnly={isContactLocked}
                  tabIndex={isContactLocked ? -1 : 0}
                  value={contactPhone}
                  onChange={isContactLocked ? undefined : (e) => setContactPhone(e.target.value)}
                  placeholder={isContactLocked ? "Telefone do contato do cliente" : "(11) 98765-4321"}
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                    isContactLocked
                      ? "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 cursor-not-allowed select-none"
                      : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  }`}
                />
              </div>
            </div>

            {/* Value, Stage, Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Valor Estimado (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Etapa do Funil *
                  </label>
                  {!isEditing && (
                    <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Obrigatório: Prospecção
                    </span>
                  )}
                </div>
                <select
                  value={isEditing ? stageId : 'prospecting'}
                  disabled={!isEditing}
                  onChange={isEditing ? (e) => setStageId(e.target.value) : undefined}
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                    !isEditing
                      ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 cursor-not-allowed select-none font-medium'
                      : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  }`}
                  title={!isEditing ? "Novas oportunidades iniciam obrigatoriamente na etapa de Prospecção." : undefined}
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Prioridade *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as DealPriority)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            {/* Source, Owner, Expected Close Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Origem do Lead *
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as DealSource)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Inbound Site">Inbound Site</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Cold Outbound">Cold Outbound</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Evento">Evento</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Responsável pela Tarefa *
                  </label>
                  {isAdmin ? (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Admin: Nomear
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                      (Definido pelo Admin)
                    </span>
                  )}
                </div>
                {isAdmin ? (
                  <select
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {assignableUsers.map((rep) => (
                      <option key={rep} value={rep}>
                        {rep}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={owner || 'Aguardando atribuição do Admin'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 cursor-not-allowed select-none font-medium"
                    title="Apenas o administrador pode nomear ou alterar o responsável pela tarefa."
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Previsão de Fechamento
                </label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Attachments Widget inside details */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Anexos desta Tarefa
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    ({attachments.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Arquivo</span>
                  </button>

                  {attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('attachments')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                    >
                      Ver todos
                    </button>
                  )}
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {attachments.slice(0, 3).map(att => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300 max-w-[200px]"
                    >
                      {getFileIcon(att.type, att.name)}
                      <span className="truncate">{att.name}</span>
                    </div>
                  ))}
                  {attachments.length > 3 && (
                    <span className="text-[11px] text-neutral-400 self-center">
                      +{attachments.length - 3} mais
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Loss Reason (if lost) */}
            {stageId === 'lost' && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <label className="block text-xs font-semibold text-rose-800 dark:text-rose-300 mb-1">
                  Motivo da Perda do Negócio *
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Selecione o motivo...</option>
                  {LOSS_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tags / Marcadores
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Ex: Urgente, Enterprise, Software (Pressione Enter)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-500 transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Anotações e Detalhes da Negociação
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Insira detalhes sobre dores do cliente, tomadores de decisão ou objeções..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta oportunidade?')) {
                      onDelete(dealToEdit.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : isEditing ? 'Atualizar Oportunidade' : 'Criar Oportunidade'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'attachments' ? (
          /* ========================================================= */
          /* ABA 2: ANEXOS & DOCUMENTOS                                */
          /* ========================================================= */
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Header info */}
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Anexos da Oportunidade / Tarefa</span>
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Faça upload de contratos, propostas comerciais, orçamentos, fotos, notas ou planilhas.
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDropFiles}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-neutral-50/50 dark:bg-neutral-800/40'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Clique para selecionar ou arraste arquivos até aqui
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                PDFs, Documentos Word, Planilhas Excel/CSV, Imagens (PNG, JPG) e comprovantes
              </p>
            </div>

            {/* List of Attachments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Arquivos Anexados ({attachments.length})
                </span>
                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar mais</span>
                  </button>
                )}
              </div>

              {attachments.length > 0 ? (
                <div className="space-y-2.5">
                  {attachments.map((att) => {
                    const isImg = att.type.startsWith('image/');
                    return (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between gap-3 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isImg && att.url ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-10 h-10 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                              {getFileIcon(att.type, att.name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-neutral-900 dark:text-white truncate" title={att.name}>
                              {att.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              <span className="font-mono">{formatFileSize(att.size)}</span>
                              <span>•</span>
                              <span>{new Date(att.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              {att.uploaded_by && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">Por: {att.uploaded_by}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            title="Baixar / Visualizar arquivo"
                            className="p-2 rounded-lg text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            title="Excluir anexo"
                            className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-400 text-xs space-y-1">
                  <Paperclip className="w-6 h-6 mx-auto opacity-40 mb-1" />
                  <p className="font-medium text-neutral-600 dark:text-neutral-300">Nenhum anexo nesta tarefa</p>
                  <p className="text-[11px] text-neutral-400">Adicione arquivos usando a área acima para manter os documentos organizados.</p>
                </div>
              )}
            </div>

            {/* Bottom Actions for Attachments */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                ← Voltar para Dados
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : isEditing ? 'Salvar Oportunidade' : 'Criar Oportunidade'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* ABA 3: HISTÓRICO & ATIVIDADES                             */
          /* ========================================================= */
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Quick add activity form */}
            <form onSubmit={handleAddActivitySubmit} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                Registrar Nova Interação
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivityType('note')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${activityType === 'note' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                >
                  Anotação
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('call')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${activityType === 'call' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                >
                  Ligação
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('meeting')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${activityType === 'meeting' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                >
                  Reunião
                </button>
                <button
                  type="button"
                  onClick={() => setActivityType('whatsapp')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${activityType === 'whatsapp' ? 'bg-indigo-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                >
                  WhatsApp
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  placeholder="Descreva o que foi tratado (ex: Cliente pediu desconto de 5%)..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={addingActivity || !activityDesc.trim()}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </form>

            {/* Activities Timeline */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Linha do Tempo
              </span>

              {dealToEdit?.activities && dealToEdit.activities.length > 0 ? (
                <div className="space-y-2.5">
                  {dealToEdit.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300 capitalize">
                          {act.type === 'call' ? '📞 Ligação' : act.type === 'meeting' ? '👥 Reunião' : act.type === 'whatsapp' ? '💬 WhatsApp' : '📝 Anotação'}
                        </span>
                        <span className="font-mono tabular-nums text-[11px]">
                          {new Date(act.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-neutral-800 dark:text-neutral-200">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-neutral-400 block">
                        Por: {act.created_by}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  Nenhuma atividade registrada nesta oportunidade.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
