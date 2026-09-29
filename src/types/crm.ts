export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DealSource = 
  | 'Inbound Site' 
  | 'WhatsApp' 
  | 'Indicação' 
  | 'Cold Outbound' 
  | 'Instagram' 
  | 'Google Ads' 
  | 'LinkedIn' 
  | 'Evento';

export interface DealActivity {
  id: string;
  deal_id: string;
  type: 'call' | 'meeting' | 'note' | 'stage_change' | 'whatsapp';
  description: string;
  created_at: string;
  created_by: string;
}

export interface DealAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL or external URL
  created_at: string;
  uploaded_by?: string;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  value: number;
  stage_id: string;
  priority: DealPriority;
  source: DealSource;
  owner: string;
  expected_close_date: string; // YYYY-MM-DD
  notes: string;
  loss_reason?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  activities?: DealActivity[];
  attachments?: DealAttachment[];
}

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  is_won?: boolean;
  is_lost?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

// Interface de Empresas / Clientes (Fornecedores e Parceiros)
export interface Supplier {
  id: string;
  name: string; // Razão Social / Nome Fantasia da Empresa ou Cliente
  cnpj: string; // CNPJ ou CPF
  email: string; // E-mail institucional ou de contato
  contact_name: string; // Nome do Contato / Representante
  phone: string; // Telefone / WhatsApp comercial
  category?: string; // Segmento / Categoria (ex: Tecnologia, Serviços, Varejo, etc.)
  notes?: string; // Observações ou condições comerciais
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export type CompanyClient = Supplier;
