import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Deal, DealPriority, DealSource, FunnelStage } from '../types/crm';
import { KanbanCard } from './KanbanCard';
import { formatCurrencyBRL } from '../services/supabaseService';
import { 
  Search, 
  Filter, 
  Plus, 
  RotateCcw, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

interface KanbanBoardProps {
  stages: FunnelStage[];
  deals: Deal[];
  onEditDeal: (deal: Deal) => void;
  onNewDealAtStage: (stageId: string) => void;
  onMoveDealStage: (dealId: string, newStageId: string) => Promise<void>;
  isLoading?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  deals,
  onEditDeal,
  onNewDealAtStage,
  onMoveDealStage,
  isLoading
}) => {
  const { isCommercial, usersList } = useAuth();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = deal.title.toLowerCase().includes(query);
        const matchCompany = deal.company.toLowerCase().includes(query);
        const matchContact = (deal.contact_name || '').toLowerCase().includes(query);
        const matchTag = deal.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchCompany && !matchContact && !matchTag) return false;
      }

      // Priority
      if (selectedPriority !== 'all' && deal.priority !== selectedPriority) {
        return false;
      }

      // Owner
      if (selectedOwner !== 'all' && deal.owner !== selectedOwner) {
        return false;
      }

      // Source
      if (selectedSource !== 'all' && deal.source !== selectedSource) {
        return false;
      }

      return true;
    });
  }, [deals, searchTerm, selectedPriority, selectedOwner, selectedSource]);

  // Overall pipeline metrics summary
  const totalPipelineValue = useMemo(() => {
    return filteredDeals
      .filter((d) => d.stage_id !== 'won' && d.stage_id !== 'lost')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [filteredDeals]);

  const totalWonValue = useMemo(() => {
    return filteredDeals
      .filter((d) => d.stage_id === 'won')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [filteredDeals]);

  const activeDealsCount = useMemo(() => {
    return filteredDeals.filter((d) => d.stage_id !== 'won' && d.stage_id !== 'lost').length;
  }, [filteredDeals]);

  const hasActiveFilters = searchTerm !== '' || selectedPriority !== 'all' || selectedOwner !== 'all' || selectedSource !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedPriority('all');
    setSelectedOwner('all');
    setSelectedSource('all');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    e.dataTransfer.setData('text/plain', deal.id);
    setDraggedDealId(deal.id);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: string) => {
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (dealId) {
      await onMoveDealStage(dealId, stageId);
    }
    setDraggedDealId(null);
  };

  // Move stage via card buttons
  const handleMoveStage = async (deal: Deal, direction: 'prev' | 'next') => {
    const currentIndex = stages.findIndex((s) => s.id === deal.stage_id);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < stages.length) {
      await onMoveDealStage(deal.id, stages[nextIndex].id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Pipeline Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        
        {/* Metric Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
              Em Pipeline Ativo
            </span>
            <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrencyBRL(totalPipelineValue)}
            </div>
            <span className="text-xs text-neutral-400">
              {activeDealsCount} oportunidades em curso
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
              Ganhos / Faturados
            </span>
            <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatCurrencyBRL(totalWonValue)}
            </div>
            <span className="text-xs text-neutral-400">
              {filteredDeals.filter(d => d.stage_id === 'won').length} contratos fechados
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
              Total de Oportunidades
            </span>
            <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
              {filteredDeals.length}
            </div>
            <span className="text-xs text-neutral-400">
              {deals.length} cadastradas no total
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
              Taxa de Sucesso (Win Rate)
            </span>
            <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {filteredDeals.length > 0
                ? `${Math.round(
                    (filteredDeals.filter((d) => d.stage_id === 'won').length /
                      (filteredDeals.filter((d) => d.stage_id === 'won' || d.stage_id === 'lost').length || 1)) *
                      100
                  )}%`
                : '0%'}
            </div>
            <span className="text-xs text-neutral-400">
              sobre negócios concluídos
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por oportunidade, empresa, contato ou tag..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>

            {/* Owner filter - Apenas Usuários Cadastrados */}
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Responsáveis</option>
              {(usersList || []).map((u) => (
                <option key={u.username} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Source filter */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas as Origens</option>
              <option value="Inbound Site">Inbound Site</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Indicação">Indicação</option>
              <option value="Cold Outbound">Cold Outbound</option>
              <option value="Instagram">Instagram</option>
              <option value="Google Ads">Google Ads</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Evento">Evento</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Kanban Board Columns Viewport */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[1300px] items-start">
          {stages.map((stage, stageIdx) => {
            const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
            const stageTotalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            const isDragTarget = dragOverStageId === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`flex-1 min-w-[240px] max-w-[280px] bg-neutral-100/70 dark:bg-neutral-900/50 rounded-2xl border transition-all flex flex-col p-3 ${
                  isDragTarget
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-neutral-200 dark:border-neutral-800/80'
                }`}
              >
                {/* Column Header */}
                <div className="px-1 py-2 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: stage.color }} 
                    />
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {stage.name}
                    </h3>
                  </div>

                  <span className="text-xs font-mono tabular-nums text-neutral-500 dark:text-neutral-400 font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Subheader: Total stage value in BRL */}
                <div className="px-1 pb-2.5 mb-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 dark:text-neutral-400">Total:</span>
                  <span className="font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-200">
                    {formatCurrencyBRL(stageTotalValue)}
                  </span>
                </div>

                {/* Deals List */}
                <div className="space-y-3 min-h-[160px] flex-1">
                  {stageDeals.length > 0 ? (
                    stageDeals.map((deal) => (
                      <KanbanCard
                        key={deal.id}
                        deal={deal}
                        onEdit={onEditDeal}
                        onMoveStage={handleMoveStage}
                        canMovePrev={stageIdx > 0}
                        canMoveNext={stageIdx < stages.length - 1}
                        onDragStart={handleDragStart}
                      />
                    ))
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-center p-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 dark:text-neutral-500 text-xs">
                      <span>Nenhum lead nesta etapa</span>
                      <span className="text-[10px] mt-1 text-neutral-400">
                        Arraste ou crie uma oportunidade
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Add Button - Exclusivo para Comercial na etapa de Prospecção */}
                {isCommercial && stage.id === 'prospecting' && (
                  <button
                    type="button"
                    onClick={() => onNewDealAtStage('prospecting')}
                    className="mt-3 w-full py-2 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nova Oportunidade (Prospecção)</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
