import React from 'react';
import { Deal } from '../types/crm';
import { formatCurrencyBRL } from '../services/supabaseService';
import { 
  Building2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  AlertCircle,
  Paperclip 
} from 'lucide-react';

interface KanbanCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onMoveStage?: (deal: Deal, direction: 'prev' | 'next') => void;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  deal,
  onEdit,
  onMoveStage,
  canMovePrev,
  canMoveNext,
  onDragStart
}) => {
  const isOverdue = deal.expected_close_date && new Date(deal.expected_close_date) < new Date();

  // Priority indicator styles
  const priorityMap = {
    low: { label: 'Baixa', dot: 'bg-neutral-400' },
    medium: { label: 'Média', dot: 'bg-sky-500' },
    high: { label: 'Alta', dot: 'bg-amber-500' },
    urgent: { label: 'Urgente', dot: 'bg-rose-500' }
  };

  const priorityInfo = priorityMap[deal.priority] || priorityMap.medium;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={() => onEdit(deal)}
      className="group relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top row: Company & Priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 truncate flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="truncate">{deal.company}</span>
        </span>

        {/* Priority: clean text with dot indicator, no pill */}
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
          <span>{priorityInfo.label}</span>
        </span>
      </div>

      {/* Deal Title */}
      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {deal.title}
      </h4>

      {/* Value in Tabular BRL */}
      <div className="mb-3">
        <span className="text-base font-bold text-neutral-900 dark:text-white font-mono tabular-nums tracking-tight">
          {formatCurrencyBRL(deal.value)}
        </span>
      </div>

      {/* Unboxed Metadata (Section A: Zero-Pill discipline) */}
      <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 shrink-0 opacity-70 text-indigo-500" />
          <span className="truncate font-medium text-neutral-600 dark:text-neutral-300" title={`Responsável: ${deal.owner || 'Não atribuído'}`}>
            {deal.owner || 'Sem responsável'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {deal.attachments && deal.attachments.length > 0 && (
            <span 
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400" 
              title={`${deal.attachments.length} anexo(s)`}
            >
              <Paperclip className="w-3 h-3" />
              <span>{deal.attachments.length}</span>
            </span>
          )}

          {deal.expected_close_date && (
            <div className={`flex items-center gap-1 font-mono tabular-nums ${isOverdue ? 'text-rose-500 dark:text-rose-400 font-medium' : ''}`}>
              {isOverdue && <AlertCircle className="w-3 h-3" />}
              <Calendar className="w-3 h-3 opacity-60" />
              <span>
                {new Date(deal.expected_close_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stage Shift Arrows (Accessible hover buttons to move without dragging) */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between"
      >
        <button
          type="button"
          disabled={!canMovePrev}
          onClick={() => onMoveStage && onMoveStage(deal, 'prev')}
          title="Mover para etapa anterior"
          className="p-1 rounded text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
          {deal.source}
        </span>

        <button
          type="button"
          disabled={!canMoveNext}
          onClick={() => onMoveStage && onMoveStage(deal, 'next')}
          title="Avançar para próxima etapa"
          className="p-1 rounded text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
