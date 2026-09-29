import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Deal, DealActivity, SupabaseConfig, Supplier } from '../types/crm';
import { INITIAL_DEALS } from '../data/initialData';

const CONFIG_STORAGE_KEY = 'funilvendas_supabase_config';
const LOCAL_DEALS_KEY = 'funilvendas_local_deals';

let supabaseInstance: SupabaseClient | null = null;

// Get Supabase configuration from localStorage or Vite environment variables
export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          isConnected: true
        };
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração do Supabase:', e);
  }

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConnected: true
    };
  }

  return {
    url: '',
    anonKey: '',
    isConnected: false
  };
}

// Save configuration to localStorage and re-initialize client
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (url && anonKey) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
    try {
      supabaseInstance = createClient(url.trim(), anonKey.trim());
    } catch (err) {
      console.error('Falha ao inicializar cliente Supabase:', err);
    }
  } else {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    supabaseInstance = null;
  }
}

// Get or initialize active Supabase client
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSavedSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
      return supabaseInstance;
    } catch (e) {
      console.error('Erro ao criar cliente Supabase:', e);
      return null;
    }
  }
  return null;
}

// Test connection to Supabase
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const tempClient = createClient(url.trim(), anonKey.trim());
    const { error } = await tempClient.from('deals').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet, but credentials authenticated:
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conexão autorizada com sucesso! A tabela "deals" ainda não foi criada. Copie e execute o script SQL disponibilizado.' 
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao conectar ao Supabase. Verifique a URL e a Anon Key.' };
  }
}

// Local deals management fallback
export function isMockDeal(deal: Deal): boolean {
  if (!deal || !deal.id) return false;
  if (deal.id.startsWith('deal-00') || deal.id.startsWith('deal-01')) return true;
  const mockTitles = [
    'Implantação ERP em Nuvem',
    'Consultoria de Automação de Processos',
    'Módulo de Gestão de Estoque Multi-filial',
    'Licenciamento CRM Corporativo (50 users)',
    'Migração de Infraestrutura para Cloud',
    'Treinamento e Capacitação em Vendas B2B',
    'App Mobile de Entregas Rápidas',
    'Auditoria de Segurança da Informação (LGPD)',
    'Plataforma E-commerce B2B',
    'Dashboard de Business Intelligence (PowerBI)',
    'Portal do Fornecedor e Cotações Automáticas',
    'Sistema de Agendamento Online'
  ];
  return mockTitles.includes(deal.title);
}

export function isMockSupplier(supp: Supplier): boolean {
  if (!supp || !supp.id) return false;
  if (['supp-1', 'supp-2', 'supp-3'].includes(supp.id)) return true;
  const mockNames = [
    'TechCloud Soluções em Nuvem Ltda',
    'MegaLink Telecomunicações',
    'Print & Brindes Corporativos'
  ];
  return mockNames.includes(supp.name);
}

const USERS_STORAGE_KEY = 'kanflow_registered_users';

function getValidRegisteredOwnerNames(): string[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u: any) => u.name).filter(Boolean);
      }
    }
  } catch (e) {}
  return ['Acesso Comercial', 'Thais Paiva', 'Gerenciador (Admin)'];
}

function getLocalDeals(): Deal[] {
  try {
    const raw = localStorage.getItem(LOCAL_DEALS_KEY);
    if (raw) {
      const parsed: Deal[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filtrar e manter EXCLUSIVAMENTE os negócios reais inseridos pelo usuário
        const userDeals = parsed.filter(d => !isMockDeal(d));
        const validOwners = getValidRegisteredOwnerNames();
        const defaultOwner = validOwners[0] || 'Acesso Comercial';
        
        // Apagar históricos de nomes antigos que não estão cadastrados
        const sanitized = userDeals.map(d => {
          let owner = d.owner;
          if (!owner || owner === 'adm' || owner === 'admin' || (validOwners.length > 0 && !validOwners.includes(owner))) {
            owner = defaultOwner;
          }
          return {
            ...d,
            owner
          };
        });
        
        saveLocalDeals(sanitized);
        return sanitized;
      }
    }
  } catch (e) {
    console.error('Erro ao ler negócios locais:', e);
  }
  return [];
}

function saveLocalDeals(deals: Deal[]): void {
  try {
    localStorage.setItem(LOCAL_DEALS_KEY, JSON.stringify(deals));
  } catch (e) {
    console.error('Erro ao salvar negócios locais:', e);
  }
}

// Fetch all deals (from Supabase or local storage)
export async function fetchDeals(): Promise<Deal[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Filtrar dados demonstrativos mantendo somente o que o usuário inseriu
        const filtered = (data as any[]).filter(d => !isMockDeal(d));
        const mappedDeals: Deal[] = filtered.map((d: any) => ({
          ...d,
          value: Number(d.value) || 0,
          tags: Array.isArray(d.tags) ? d.tags : [],
          attachments: Array.isArray(d.attachments) ? d.attachments : []
        }));
        saveLocalDeals(mappedDeals);
        return mappedDeals;
      }
    } catch (e) {
      console.warn('Erro ao buscar do Supabase, recorrendo ao banco local:', e);
    }
  }

  return getLocalDeals();
}

// Create a new deal
export async function createDeal(dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
  const newDeal: Deal = {
    ...dealData,
    attachments: dealData.attachments || [],
    id: `deal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    activities: [
      {
        id: `act-${Date.now()}`,
        deal_id: '',
        type: 'stage_change',
        description: `Oportunidade criada na etapa "${dealData.stage_id}".`,
        created_at: new Date().toISOString(),
        created_by: dealData.owner || 'Thais Paiva'
      }
    ]
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('deals')
        .insert([{
          title: newDeal.title,
          company: newDeal.company,
          contact_name: newDeal.contact_name,
          contact_email: newDeal.contact_email,
          contact_phone: newDeal.contact_phone,
          value: newDeal.value,
          stage_id: newDeal.stage_id,
          priority: newDeal.priority,
          source: newDeal.source,
          owner: newDeal.owner,
          expected_close_date: newDeal.expected_close_date,
          notes: newDeal.notes,
          loss_reason: newDeal.loss_reason,
          tags: newDeal.tags
        }])
        .select()
        .single();

      if (!error && data) {
        const syncedDeal: Deal = {
          ...newDeal,
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        // Also update local copy
        const currentLocal = getLocalDeals();
        saveLocalDeals([syncedDeal, ...currentLocal]);
        return syncedDeal;
      }
    } catch (e) {
      console.warn('Falha ao salvar no Supabase, salvando localmente:', e);
    }
  }

  // Local fallback
  const currentLocal = getLocalDeals();
  const updated = [newDeal, ...currentLocal];
  saveLocalDeals(updated);
  return newDeal;
}

// Update deal
export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();

  if (client) {
    try {
      const { data, error } = await client
        .from('deals')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const synced: Deal = {
          ...data,
          value: Number(data.value) || 0,
          tags: Array.isArray(data.tags) ? data.tags : [],
          attachments: updates.attachments !== undefined ? updates.attachments : (Array.isArray(data.attachments) ? data.attachments : [])
        };
        const local = getLocalDeals().map(d => d.id === id ? { ...d, ...synced } : d);
        saveLocalDeals(local);
        return synced;
      }
    } catch (e) {
      console.warn('Falha ao atualizar no Supabase, atualizando localmente:', e);
    }
  }

  const currentLocal = getLocalDeals();
  let updatedDeal: Deal | null = null;
  const nextList = currentLocal.map(d => {
    if (d.id === id) {
      updatedDeal = { ...d, ...updates, updated_at: now };
      return updatedDeal;
    }
    return d;
  });

  if (updatedDeal) {
    saveLocalDeals(nextList);
    return updatedDeal;
  }
  throw new Error(`Negócio com id ${id} não encontrado`);
}

// Delete deal
export async function deleteDeal(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('deals').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar no Supabase:', e);
    }
  }

  const currentLocal = getLocalDeals();
  saveLocalDeals(currentLocal.filter(d => d.id !== id));
  return true;
}

// Add activity to a deal
export async function addDealActivity(dealId: string, activity: Omit<DealActivity, 'id' | 'deal_id' | 'created_at'>): Promise<DealActivity> {
  const newActivity: DealActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    deal_id: dealId,
    created_at: new Date().toISOString()
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('deal_activities').insert([{
        deal_id: dealId,
        type: newActivity.type,
        description: newActivity.description,
        created_by: newActivity.created_by
      }]);
    } catch (e) {
      console.warn('Erro ao salvar atividade no Supabase:', e);
    }
  }

  const currentLocal = getLocalDeals();
  const nextList = currentLocal.map(d => {
    if (d.id === dealId) {
      const activities = d.activities ? [newActivity, ...d.activities] : [newActivity];
      return { ...d, activities, updated_at: new Date().toISOString() };
    }
    return d;
  });
  saveLocalDeals(nextList);

  return newActivity;
}

// Sync local deals into Supabase
export async function syncLocalToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase não está configurado.' };
  }

  const localDeals = getLocalDeals();
  if (localDeals.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const payload = localDeals.map(d => ({
      title: d.title,
      company: d.company,
      contact_name: d.contact_name,
      contact_email: d.contact_email,
      contact_phone: d.contact_phone,
      value: d.value,
      stage_id: d.stage_id,
      priority: d.priority,
      source: d.source,
      owner: d.owner,
      expected_close_date: d.expected_close_date || null,
      notes: d.notes,
      loss_reason: d.loss_reason || null,
      tags: d.tags || []
    }));

    const { error } = await client.from('deals').insert(payload);
    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: localDeals.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Erro ao sincronizar.' };
  }
}

// Format currency helper (BRL)
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);
}

// Reset local deals to clean state
export function resetToDemoData(): Deal[] {
  saveLocalDeals([]);
  return [];
}

// ==========================================
// SERVIÇO DE FORNECEDORES (SUPPLIERS)
// CNPJ, E-mail, Contato e Telefone
// ==========================================

const LOCAL_SUPPLIERS_KEY = 'kanflow_local_suppliers';

// Sem fornecedores fictícios: mantém apenas fornecedores cadastrados pelo usuário
export const INITIAL_SUPPLIERS: Supplier[] = [];

export function getLocalSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUPPLIERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filtrar e descartar dados fictícios, mantendo EXCLUSIVAMENTE o que o usuário cadastrou
        const userSuppliers = parsed.filter(s => !isMockSupplier(s));
        if (userSuppliers.length !== parsed.length) {
          saveLocalSuppliers(userSuppliers);
        }
        return userSuppliers;
      }
    }
  } catch (e) {
    console.error('Erro ao ler fornecedores locais:', e);
  }
  return [];
}

export function saveLocalSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Erro ao salvar fornecedores locais:', e);
  }
}

// Fetch all suppliers (from Supabase or Local)
export async function fetchSuppliers(): Promise<Supplier[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        // Filtrar para garantir que nenhum fornecedor fictício apareça
        const filtered = (data as Supplier[]).filter(s => !isMockSupplier(s));
        saveLocalSuppliers(filtered);
        return filtered;
      }
    } catch (e) {
      console.warn('Erro ao consultar fornecedores do Supabase, recorrendo ao banco local:', e);
    }
  }
  return getLocalSuppliers();
}

// Limpeza geral para expurgar dados demonstrativos residuais
export function purgeMockData(): void {
  try {
    const rawDeals = localStorage.getItem(LOCAL_DEALS_KEY);
    if (rawDeals) {
      const parsed: Deal[] = JSON.parse(rawDeals);
      if (Array.isArray(parsed)) {
        const userDeals = parsed.filter(d => !isMockDeal(d));
        localStorage.setItem(LOCAL_DEALS_KEY, JSON.stringify(userDeals));
      }
    } else {
      localStorage.setItem(LOCAL_DEALS_KEY, JSON.stringify([]));
    }
  } catch (e) {
    console.error(e);
  }

  try {
    const rawSuppliers = localStorage.getItem(LOCAL_SUPPLIERS_KEY);
    if (rawSuppliers) {
      const parsed: Supplier[] = JSON.parse(rawSuppliers);
      if (Array.isArray(parsed)) {
        const userSuppliers = parsed.filter(s => !isMockSupplier(s));
        localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(userSuppliers));
      }
    } else {
      localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify([]));
    }
  } catch (e) {
    console.error(e);
  }

  const client = getSupabaseClient();
  if (client) {
    const mockDealIds = [
      'deal-001', 'deal-002', 'deal-003', 'deal-004', 'deal-005', 'deal-006',
      'deal-007', 'deal-008', 'deal-009', 'deal-010', 'deal-011', 'deal-012'
    ];
    void (async () => {
      try {
        await client.from('deals').delete().in('id', mockDealIds);
        await client.from('suppliers').delete().in('id', ['supp-1', 'supp-2', 'supp-3']);
      } catch (err) {
        console.warn('Erro ao limpar dados de exemplo no Supabase:', err);
      }
    })();
  }
}

// Disparar limpeza de dados fictícios
purgeMockData();

// Create new supplier
export async function createSupplier(supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
  const newSupplier: Supplier = {
    ...supplierData,
    id: `supp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('suppliers')
        .insert([{
          name: newSupplier.name,
          cnpj: newSupplier.cnpj,
          email: newSupplier.email,
          contact_name: newSupplier.contact_name,
          phone: newSupplier.phone,
          category: newSupplier.category || 'Geral',
          notes: newSupplier.notes || '',
          status: newSupplier.status || 'active'
        }])
        .select()
        .single();

      if (!error && data) {
        newSupplier.id = data.id;
      }
    } catch (e) {
      console.warn('Erro ao criar fornecedor no Supabase, salvando localmente:', e);
    }
  }

  const current = getLocalSuppliers();
  const updated = [newSupplier, ...current];
  saveLocalSuppliers(updated);
  return newSupplier;
}

// Update existing supplier
export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('suppliers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Erro ao atualizar fornecedor no Supabase:', e);
    }
  }

  const current = getLocalSuppliers();
  const index = current.findIndex(s => s.id === id);
  if (index !== -1) {
    current[index] = {
      ...current[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveLocalSuppliers(current);
    return current[index];
  }
  throw new Error('Fornecedor não encontrado.');
}

// Delete supplier
export async function deleteSupplier(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('suppliers').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar fornecedor do Supabase:', e);
    }
  }

  const current = getLocalSuppliers();
  const filtered = current.filter(s => s.id !== id);
  saveLocalSuppliers(filtered);
  return true;
}

