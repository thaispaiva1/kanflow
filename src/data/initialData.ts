import { Deal, FunnelStage } from '../types/crm';

export const DEFAULT_STAGES: FunnelStage[] = [
  {
    id: 'prospecting',
    name: '1. Prospecção',
    order: 1,
    color: '#6366F1', // Indigo
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    description: 'Leads recém-chegados aguardando primeiro contato'
  },
  {
    id: 'qualification',
    name: '2. Qualificação',
    order: 2,
    color: '#0EA5E9', // Sky
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    badgeText: 'text-sky-600 dark:text-sky-400',
    description: 'Contato inicial realizado, validando orçamento e autoridade'
  },
  {
    id: 'proposal',
    name: '3. Proposta Enviada',
    order: 3,
    color: '#F59E0B', // Amber
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-600 dark:text-amber-400',
    description: 'Proposta comercial apresentada formalmente ao tomador'
  },
  {
    id: 'negotiation',
    name: '4. Negociação',
    order: 4,
    color: '#8B5CF6', // Purple
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    badgeText: 'text-purple-600 dark:text-purple-400',
    description: 'Alinhamento de valores, prazos contratuais e condições'
  },
  {
    id: 'won',
    name: '5. Fechado / Ganho',
    order: 5,
    color: '#10B981', // Emerald
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    description: 'Contrato assinado com sucesso',
    is_won: true
  },
  {
    id: 'lost',
    name: '6. Perdido',
    order: 6,
    color: '#EF4444', // Red
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-600 dark:text-rose-400',
    description: 'Oportunidade desqualificada ou encerrada sem fechamento',
    is_lost: true
  }
];

// Sem dados fictícios: mantém apenas os dados reais inseridos pelo usuário
export const INITIAL_DEALS: Deal[] = [];

// Apenas usuários reais cadastrados no sistema são listados
export const SALES_REPS: string[] = [];

export const LOSS_REASONS = [
  'Preço alto',
  'Concorrência',
  'Sem orçamento',
  'Projeto adiado / cancelado',
  'Falta de recursos técnicos',
  'Não respondeu aos contatos',
  'Outro motivo'
];

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- Kanflow - Estrutura de Banco de Dados & Armazenamento (Supabase)
-- Execute este script completo no SQL Editor do seu projeto Supabase:
-- ========================================================

-- 1. Criação da tabela de oportunidades / negócios (deals)
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  value numeric(12, 2) default 0 not null,
  stage_id text not null default 'prospecting',
  priority text default 'medium',
  source text default 'Inbound Site',
  owner text default 'Acesso Comercial',
  expected_close_date date,
  notes text default '',
  loss_reason text,
  tags text[] default array[]::text[],
  attachments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Criação da tabela de atividades do funil (activities)
create table if not exists public.deal_activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  type text not null default 'note',
  description text not null,
  created_by text default 'Acesso Comercial',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Criação da tabela de empresas e clientes (suppliers)
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text not null,
  email text not null,
  contact_name text not null,
  phone text not null,
  category text default 'Geral',
  notes text default '',
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Habilitação de Row Level Security (RLS) nas Tabelas do Banco
alter table public.deals enable row level security;
alter table public.deal_activities enable row level security;
alter table public.suppliers enable row level security;

-- 5. Políticas de Acesso às Tabelas (Permissões de Leitura e Escrita)
drop policy if exists "Acesso total deals" on public.deals;
create policy "Acesso total deals" on public.deals
  for all using (true) with check (true);

drop policy if exists "Acesso total deal_activities" on public.deal_activities;
create policy "Acesso total deal_activities" on public.deal_activities
  for all using (true) with check (true);

drop policy if exists "Acesso total suppliers" on public.suppliers;
create policy "Acesso total suppliers" on public.suppliers
  for all using (true) with check (true);

-- 6. Configuração e Políticas de Armazenamento (Supabase Storage)
-- Criação do Bucket de Armazenamento de Arquivos/Anexos
insert into storage.buckets (id, name, public)
values ('deal-attachments', 'deal-attachments', true)
on conflict (id) do update set public = true;

-- Políticas de Armazenamento (RLS já é nativamente ativado pelo Supabase no Storage)
-- Política 1: Leitura e Download Público
drop policy if exists "Permitir download publico deal-attachments" on storage.objects;
create policy "Permitir download publico deal-attachments"
  on storage.objects for select
  using (bucket_id = 'deal-attachments');

-- Política 2: Upload de Novos Anexos
drop policy if exists "Permitir upload deal-attachments" on storage.objects;
create policy "Permitir upload deal-attachments"
  on storage.objects for insert
  with check (bucket_id = 'deal-attachments');

-- Política 3: Atualização de Anexos
drop policy if exists "Permitir atualizacao deal-attachments" on storage.objects;
create policy "Permitir atualizacao deal-attachments"
  on storage.objects for update
  using (bucket_id = 'deal-attachments');

-- Política 4: Exclusão de Anexos
drop policy if exists "Permitir exclusao deal-attachments" on storage.objects;
create policy "Permitir exclusao deal-attachments"
  on storage.objects for delete
  using (bucket_id = 'deal-attachments');

-- 7. Trigger para Atualização Automática da coluna updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_deals_updated_at on public.deals;
create trigger trigger_deals_updated_at
  before update on public.deals
  for each row execute procedure public.handle_updated_at();

drop trigger if exists trigger_suppliers_updated_at on public.suppliers;
create trigger trigger_suppliers_updated_at
  before update on public.suppliers
  for each row execute procedure public.handle_updated_at();

-- 8. Índices para Otimização de Consultas e Performance
create index if not exists idx_deals_stage_id on public.deals(stage_id);
create index if not exists idx_deals_owner on public.deals(owner);
create index if not exists idx_deals_created_at on public.deals(created_at desc);
create index if not exists idx_suppliers_cnpj on public.suppliers(cnpj);

-- Pronto! Banco de dados e Políticas de Armazenamento (Storage) configurados com sucesso.
`;
