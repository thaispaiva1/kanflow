import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Deal, FunnelStage } from '../types/crm';
import { formatCurrencyBRL } from '../services/supabaseService';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Award, 
  Clock, 
  AlertTriangle, 
  Download, 
  Calendar, 
  Users, 
  BarChart3, 
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  Building2
} from 'lucide-react';

interface SalesDashboardProps {
  deals: Deal[];
  stages: FunnelStage[];
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ deals, stages }) => {
  const { isCommercial } = useAuth();
  const [timeFilter, setTimeFilter] = useState<'30' | '90' | '365' | 'all'>('all');
  const [chartMetric, setChartMetric] = useState<'value' | 'count'>('value');

  // Filter deals by timeframe
  const filteredDeals = useMemo(() => {
    if (timeFilter === 'all') return deals;
    const days = parseInt(timeFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return deals.filter(d => new Date(d.created_at) >= cutoff);
  }, [deals, timeFilter]);

  // Prospecting metrics calculation (Exclusivo para o Comercial)
  const prospectingMetrics = useMemo(() => {
    const prospectingDeals = filteredDeals.filter(d => d.stage_id === 'prospecting');
    const totalProspectingCount = prospectingDeals.length;
    const totalProspectingValue = prospectingDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalGenerated = filteredDeals.length;
    const advancedDeals = filteredDeals.filter(d => d.stage_id !== 'prospecting');
    const advancedCount = advancedDeals.length;
    const qualificationRate = totalGenerated > 0 ? Math.round((advancedCount / totalGenerated) * 100) : 0;
    const avgProspectingTicket = totalProspectingCount > 0 ? totalProspectingValue / totalProspectingCount : 0;

    // Sources breakdown for prospecting
    const sourceMap: Record<string, { count: number; value: number }> = {};
    prospectingDeals.forEach(d => {
      const src = d.source || 'Outro';
      if (!sourceMap[src]) sourceMap[src] = { count: 0, value: 0 };
      sourceMap[src].count += 1;
      sourceMap[src].value += d.value || 0;
    });

    const sourcesList = Object.entries(sourceMap)
      .map(([source, stats]) => ({
        source,
        ...stats,
        percentage: totalProspectingCount > 0 ? Math.round((stats.count / totalProspectingCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const topSource = sourcesList.length > 0 ? sourcesList[0] : null;

    // Priority breakdown for prospecting
    const priorityMap: Record<string, { label: string; count: number; value: number; color: string }> = {
      urgent: { label: 'Urgente', count: 0, value: 0, color: '#ef4444' },
      high: { label: 'Alta', count: 0, value: 0, color: '#f59e0b' },
      medium: { label: 'Média', count: 0, value: 0, color: '#0ea5e9' },
      low: { label: 'Baixa', count: 0, value: 0, color: '#9ca3af' }
    };
    prospectingDeals.forEach(d => {
      const p = d.priority || 'medium';
      if (priorityMap[p]) {
        priorityMap[p].count += 1;
        priorityMap[p].value += d.value || 0;
      }
    });

    const priorityList = Object.values(priorityMap).map(item => ({
      ...item,
      percentage: totalProspectingCount > 0 ? Math.round((item.count / totalProspectingCount) * 100) : 0
    }));

    return {
      prospectingDeals,
      totalProspectingCount,
      totalProspectingValue,
      totalGenerated,
      advancedCount,
      qualificationRate,
      avgProspectingTicket,
      sourcesList,
      topSource,
      priorityList
    };
  }, [filteredDeals]);

  // Core metrics calculation
  const metrics = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const activeDeals = filteredDeals.filter(d => d.stage_id !== 'won' && d.stage_id !== 'lost');
    const wonDeals = filteredDeals.filter(d => d.stage_id === 'won');
    const lostDeals = filteredDeals.filter(d => d.stage_id === 'lost');

    const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalWonRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalLostValue = lostDeals.reduce((sum, d) => sum + (d.value || 0), 0);

    const completedCount = wonDeals.length + lostDeals.length;
    const winRate = completedCount > 0 ? (wonDeals.length / completedCount) * 100 : 0;
    const averageTicket = wonDeals.length > 0 ? totalWonRevenue / wonDeals.length : 0;

    // Average sales cycle in days
    let avgDays = 0;
    if (wonDeals.length > 0) {
      const totalDays = wonDeals.reduce((acc, d) => {
        const start = new Date(d.created_at).getTime();
        const end = new Date(d.updated_at || d.created_at).getTime();
        const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        return acc + diff;
      }, 0);
      avgDays = Math.round(totalDays / wonDeals.length);
    }

    return {
      totalDeals,
      activeDealsCount: activeDeals.length,
      wonDealsCount: wonDeals.length,
      lostDealsCount: lostDeals.length,
      totalPipelineValue,
      totalWonRevenue,
      totalLostValue,
      winRate: Math.round(winRate),
      averageTicket,
      avgDays: avgDays || 18
    };
  }, [filteredDeals]);

  // Stage conversion funnel data
  const funnelData = useMemo(() => {
    return stages.map(stage => {
      const stageDeals = filteredDeals.filter(d => d.stage_id === stage.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const count = stageDeals.length;
      const percentOfTotal = filteredDeals.length > 0 ? (count / filteredDeals.length) * 100 : 0;
      return {
        stage,
        count,
        totalValue,
        percentOfTotal
      };
    });
  }, [filteredDeals, stages]);

  // Monthly Revenue Trend (Timeline Chart)
  const monthlyTrendData = useMemo(() => {
    const monthsMap: Record<string, { label: string; wonValue: number; pipelineValue: number; count: number }> = {};
    
    // Sort chronological
    const sorted = [...filteredDeals].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    sorted.forEach(d => {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthsMap[key]) {
        monthsMap[key] = { label: monthName, wonValue: 0, pipelineValue: 0, count: 0 };
      }
      monthsMap[key].count += 1;
      if (d.stage_id === 'won') {
        monthsMap[key].wonValue += d.value || 0;
      } else if (d.stage_id !== 'lost') {
        monthsMap[key].pipelineValue += d.value || 0;
      }
    });

    const entries = Object.entries(monthsMap);
    if (entries.length === 0) {
      return [
        { label: 'Jul/26', wonValue: 45000, pipelineValue: 70000, count: 3 },
        { label: 'Ago/26', wonValue: 130000, pipelineValue: 110000, count: 5 },
        { label: 'Set/26', wonValue: 192000, pipelineValue: 249000, count: 8 }
      ];
    }
    return entries.map(([_, val]) => val);
  }, [filteredDeals]);

  const maxMonthValue = useMemo(() => {
    return Math.max(...monthlyTrendData.map(m => m.wonValue + m.pipelineValue), 1);
  }, [monthlyTrendData]);

  // Deals by Source / Acquisition Channel
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; value: number; wonCount: number }> = {};
    filteredDeals.forEach(d => {
      const src = d.source || 'Outros';
      if (!counts[src]) {
        counts[src] = { count: 0, value: 0, wonCount: 0 };
      }
      counts[src].count += 1;
      counts[src].value += d.value || 0;
      if (d.stage_id === 'won') {
        counts[src].wonCount += 1;
      }
    });

    return Object.entries(counts)
      .map(([source, stats]) => ({
        source,
        ...stats,
        percentage: filteredDeals.length > 0 ? (stats.count / filteredDeals.length) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDeals]);

  // Priority Distribution Chart
  const priorityDistribution = useMemo(() => {
    const counts: Record<string, { label: string; count: number; value: number; color: string }> = {
      urgent: { label: 'Urgente', count: 0, value: 0, color: '#ef4444' },
      high: { label: 'Alta', count: 0, value: 0, color: '#f59e0b' },
      medium: { label: 'Média', count: 0, value: 0, color: '#0ea5e9' },
      low: { label: 'Baixa', count: 0, value: 0, color: '#9ca3af' }
    };

    filteredDeals.forEach(d => {
      const p = d.priority || 'medium';
      if (counts[p]) {
        counts[p].count += 1;
        counts[p].value += d.value || 0;
      }
    });

    const total = filteredDeals.length || 1;
    return Object.values(counts).map(item => ({
      ...item,
      percentage: Math.round((item.count / total) * 100)
    }));
  }, [filteredDeals]);

  // Loss reasons breakdown
  const lossReasonBreakdown = useMemo(() => {
    const lostDeals = filteredDeals.filter(d => d.stage_id === 'lost');
    const reasons: Record<string, number> = {};
    lostDeals.forEach(d => {
      const reason = d.loss_reason || 'Não informado / Outros';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return Object.entries(reasons)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: lostDeals.length > 0 ? (count / lostDeals.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredDeals]);

  // Reps Performance Table (excluindo qualquer registro sob 'adm' ou 'admin')
  const repPerformance = useMemo(() => {
    const reps: Record<string, { total: number; won: number; wonValue: number; pipelineValue: number }> = {};
    filteredDeals.forEach(d => {
      const rawRep = d.owner || 'Não atribuído';
      // Excluir adm/admin do ranking comercial
      if (rawRep.toLowerCase() === 'adm' || rawRep.toLowerCase() === 'admin') {
        return;
      }
      const rep = rawRep;
      if (!reps[rep]) {
        reps[rep] = { total: 0, won: 0, wonValue: 0, pipelineValue: 0 };
      }
      reps[rep].total += 1;
      if (d.stage_id === 'won') {
        reps[rep].won += 1;
        reps[rep].wonValue += d.value || 0;
      } else if (d.stage_id !== 'lost') {
        reps[rep].pipelineValue += d.value || 0;
      }
    });

    return Object.entries(reps)
      .map(([rep, stats]) => ({
        rep,
        ...stats,
        conversionRate: stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [filteredDeals]);

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = ['ID', 'Titulo', 'Empresa', 'Contato', 'Email', 'Telefone', 'Valor_BRL', 'Etapa', 'Prioridade', 'Origem', 'Responsavel', 'Data_Prevista', 'Motivo_Perda', 'Criado_Em'];
    const rows = filteredDeals.map(d => [
      d.id,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.company || '').replace(/"/g, '""')}"`,
      `"${(d.contact_name || '').replace(/"/g, '""')}"`,
      `"${(d.contact_email || '').replace(/"/g, '""')}"`,
      `"${(d.contact_phone || '').replace(/"/g, '""')}"`,
      d.value,
      stages.find(s => s.id === d.stage_id)?.name || d.stage_id,
      d.priority,
      d.source,
      d.owner,
      d.expected_close_date || '',
      `"${(d.loss_reason || '').replace(/"/g, '""')}"`,
      d.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kanflow_relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for Prospecting specifically
  const handleExportProspectingCSV = () => {
    const prospectingList = filteredDeals.filter(d => d.stage_id === 'prospecting');
    const headers = ['ID', 'Titulo', 'Empresa', 'Contato', 'Email', 'Telefone', 'Valor_BRL', 'Prioridade', 'Origem', 'Responsavel', 'Data_Cadastro'];
    const rows = prospectingList.map(d => [
      d.id,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.company || '').replace(/"/g, '""')}"`,
      `"${(d.contact_name || '').replace(/"/g, '""')}"`,
      `"${(d.contact_email || '').replace(/"/g, '""')}"`,
      `"${(d.contact_phone || '').replace(/"/g, '""')}"`,
      d.value,
      d.priority,
      d.source,
      d.owner,
      d.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kanflow_leads_prospeccao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // VISÃO EXCLUSIVA DO COMERCIAL: APENAS INDICADORES DE PROSPECÇÃO
  // =========================================================================
  if (isCommercial) {
    return (
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Target className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Indicadores de Prospecção
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Painel exclusivo do Comercial: acompanhamento de leads prospectados, canais de aquisição e qualificação inicial
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented timeframe */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setTimeFilter('30')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === '30'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                30 dias
              </button>
              <button
                onClick={() => setTimeFilter('90')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === '90'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                90 dias
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportProspectingCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              title="Exportar leads em prospecção para CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar Leads (CSV)</span>
            </button>
          </div>
        </div>

        {/* Prospecting KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Leads em Prospecção */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Leads em Prospecção</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
              {prospectingMetrics.totalProspectingCount}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              aguardando qualificação
            </div>
          </div>

          {/* Card 2: Valor Estimado em Prospecção */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Pipeline de Prospecção</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatCurrencyBRL(prospectingMetrics.totalProspectingValue)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              volume financeiro em análise
            </div>
          </div>

          {/* Card 3: Total Prospectado no Período */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Prospectado</span>
              <TrendingUp className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
              {prospectingMetrics.totalGenerated}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              novos leads gerados
            </div>
          </div>

          {/* Card 4: Taxa de Avanço */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Taxa de Avanço</span>
              <ArrowUpRight className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {prospectingMetrics.qualificationRate}%
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {prospectingMetrics.advancedCount} leads avançaram no funil
            </div>
          </div>

          {/* Card 5: Principal Canal */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Canal Principal</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base font-bold text-neutral-900 dark:text-white truncate" title={prospectingMetrics.topSource?.source || 'Nenhum'}>
              {prospectingMetrics.topSource?.source || 'Nenhum'}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {prospectingMetrics.topSource ? `${prospectingMetrics.topSource.count} leads (${prospectingMetrics.topSource.percentage}%)` : 'Sem registros'}
            </div>
          </div>

          {/* Card 6: Ticket Médio em Prospecção */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Ticket Médio</span>
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
              {formatCurrencyBRL(prospectingMetrics.avgProspectingTicket)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              por lead em prospecção
            </div>
          </div>
        </div>

        {/* Charts Grid: Origens e Prioridades da Prospecção */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Origem dos Leads em Prospecção */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Origens dos Leads em Prospecção</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Canais de aquisição de onde os leads estão sendo captados
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400">
                {prospectingMetrics.totalProspectingCount} leads
              </span>
            </div>

            {prospectingMetrics.sourcesList.length > 0 ? (
              <div className="space-y-3.5">
                {prospectingMetrics.sourcesList.map((item) => (
                  <div key={item.source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {item.source}
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                        <span>{item.count} leads</span>
                        <span className="font-bold text-neutral-900 dark:text-white">({item.percentage}%)</span>
                        <span className="text-neutral-400">• {formatCurrencyBRL(item.value)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(4, item.percentage)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-400">
                Nenhum lead em prospecção com os filtros atuais.
              </div>
            )}
          </div>

          {/* Distribuição por Prioridade dos Leads em Prospecção */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span>Nível de Prioridade da Prospecção</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Distribuição de urgência para primeiro contato com o lead
              </p>
            </div>

            {/* Barra segmentada */}
            <div className="h-3 w-full flex rounded-full overflow-hidden mb-6 bg-neutral-100 dark:bg-neutral-800">
              {prospectingMetrics.priorityList.map(p => (
                <div 
                  key={p.label}
                  style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                  title={`${p.label}: ${p.count} (${p.percentage}%)`}
                  className="h-full transition-all"
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {prospectingMetrics.priorityList.map(p => (
                <div key={p.label} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{p.label}</span>
                    </div>
                    <span className="font-bold text-neutral-900 dark:text-white font-mono tabular-nums">{p.count}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                    <span>{p.percentage}% dos leads</span>
                    <span className="font-mono">{formatCurrencyBRL(p.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Leads Ativos em Prospecção */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Oportunidades Atualmente em Prospecção</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Lista de leads cadastrados na etapa inicial de primeiro contato
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono">
              {prospectingMetrics.prospectingDeals.length} oportunidade(s)
            </span>
          </div>

          {prospectingMetrics.prospectingDeals.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
              <Target className="w-8 h-8 stroke-1 text-neutral-300 dark:text-neutral-600" />
              <span className="font-medium">Nenhum lead aguardando na etapa de Prospecção no momento.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Oportunidade / Título</th>
                    <th className="py-3 px-4">Empresa / Cliente</th>
                    <th className="py-3 px-4">Contato & Telefone</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Valor Estimado</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Data de Entrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                  {prospectingMetrics.prospectingDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-semibold text-neutral-900 dark:text-white">
                        {deal.title}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                        {deal.company}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        <div>{deal.contact_name || '-'}</div>
                        {deal.contact_phone && (
                          <div className="text-[10px] text-neutral-400">{deal.contact_phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {deal.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                        {formatCurrencyBRL(deal.value)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          deal.priority === 'urgent'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : deal.priority === 'high'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : deal.priority === 'medium'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {deal.priority === 'urgent' ? 'Urgente' : deal.priority === 'high' ? 'Alta' : deal.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                        {deal.owner || 'Não atribuído'}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right font-mono text-neutral-500 dark:text-neutral-400">
                        {new Date(deal.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <span>Dashboard Executivo de Vendas</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Métricas de faturamento, gráficos de conversão e desempenho do time comercial
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex items-center gap-2">
          {/* Segmented control for timeframe */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTimeFilter('30')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === '30'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => setTimeFilter('90')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === '90'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              90 dias
            </button>
            <button
              onClick={() => setTimeFilter('365')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === '365'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Ano
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            title="Exportar dados para CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Pipeline Ativo */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pipeline Ativo</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrencyBRL(metrics.totalPipelineValue)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {metrics.activeDealsCount} leads em negociação
          </div>
        </div>

        {/* Card 2: Receita Fechada */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Receita Ganha</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {formatCurrencyBRL(metrics.totalWonRevenue)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {metrics.wonDealsCount} negócios ganhos
          </div>
        </div>

        {/* Card 3: Taxa de Conversão */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Taxa de Conversão</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
            {metrics.winRate}%
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            de oportunidades finalizadas
          </div>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
            {formatCurrencyBRL(metrics.averageTicket)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            por contrato ganho
          </div>
        </div>

        {/* Card 5: Ciclo de Vendas */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Ciclo Médio</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono tabular-nums">
            {metrics.avgDays} dias
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            do lead ao fechamento
          </div>
        </div>

        {/* Card 6: Oportunidades Perdidas */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Perdidos</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {formatCurrencyBRL(metrics.totalLostValue)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {metrics.lostDealsCount} oportunidades perdidas
          </div>
        </div>
      </div>

      {/* ===================== GRÁFICO 1: EVOLUÇÃO E PREVISÃO DE RECEITA EM BARRAS ===================== */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Gráfico de Volume Financeiro: Receita Faturada vs. Em Aberto</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Comparativo de contratos assinados (verde) e oportunidades em negociação (índigo)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span className="text-neutral-600 dark:text-neutral-300">Receita Fechada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
              <span className="text-neutral-600 dark:text-neutral-300">Em Aberto</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Canvas Visual */}
        <div className="space-y-4">
          <div className="h-56 flex items-end gap-6 sm:gap-10 pt-6 px-2 border-b border-neutral-200 dark:border-neutral-800">
            {monthlyTrendData.map((item, idx) => {
              const wonHeight = Math.max(12, Math.round((item.wonValue / maxMonthValue) * 180));
              const pipeHeight = Math.max(12, Math.round((item.pipelineValue / maxMonthValue) * 180));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-center pointer-events-none bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
                    Ganha: {formatCurrencyBRL(item.wonValue)} | Aberto: {formatCurrencyBRL(item.pipelineValue)}
                  </div>

                  {/* Dual Bar Pair */}
                  <div className="w-full max-w-[80px] flex items-end justify-center gap-1.5 h-full">
                    {/* Won bar */}
                    <div
                      style={{ height: `${wonHeight}px` }}
                      className="w-1/2 bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all relative"
                      title={`Ganho: ${formatCurrencyBRL(item.wonValue)}`}
                    />
                    {/* Pipeline bar */}
                    <div
                      style={{ height: `${pipeHeight}px` }}
                      className="w-1/2 bg-indigo-500 hover:bg-indigo-400 rounded-t-md transition-all relative"
                      title={`Em Aberto: ${formatCurrencyBRL(item.pipelineValue)}`}
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mt-2">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================== GRÁFICO 2 & 3: FUNIL VISUAL + CANAIS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Funnel Breakdown Visual */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Gráfico de Taxa de Passagem por Etapa</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Volume e valor financeiro retido em cada fase do funil
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {funnelData.map(({ stage, count, totalValue, percentOfTotal }) => (
              <div key={stage.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {stage.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {count} {count === 1 ? 'lead' : 'leads'}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatCurrencyBRL(totalValue)}
                    </span>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, Math.min(100, percentOfTotal))}%`,
                      backgroundColor: stage.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channels / Lead Sources Visual */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-500" />
                <span>Gráfico de Desempenho por Canal de Origem</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Canais de aquisição que mais geram faturamento
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {sourceBreakdown.map((item) => (
              <div key={item.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {item.source}
                  </span>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {item.count} leads ({item.wonCount} ganhos)
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrencyBRL(item.value)}
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(3, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ===================== GRÁFICO 4: DISTRIBUIÇÃO POR PRIORIDADE & ANÁLISE DE PERDAS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Distribuição por Prioridade */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Gráfico de Leads por Prioridade
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Concentração de urgência no atendimento
            </p>
          </div>

          {/* Donut / Stacked bar representation */}
          <div className="h-4 w-full flex rounded-full overflow-hidden mb-5">
            {priorityDistribution.map(p => (
              <div 
                key={p.label}
                style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                title={`${p.label}: ${p.count} (${p.percentage}%)`}
                className="h-full transition-all"
              />
            ))}
          </div>

          <div className="space-y-3">
            {priorityDistribution.map(p => (
              <div key={p.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">{p.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span>{p.count} leads</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">({p.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivos de Perda */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Análise de Motivos de Perda
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Gargalos e principais objeções de clientes
            </p>
          </div>

          {lossReasonBreakdown.length > 0 ? (
            <div className="space-y-3">
              {lossReasonBreakdown.map((item) => (
                <div key={item.reason} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {item.reason}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      {item.count} {item.count === 1 ? 'negócio' : 'negócios'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {Math.round(item.percentage)}% do total de perdas
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-neutral-400 text-xs">
              Nenhuma perda registrada no período selecionado.
            </div>
          )}
        </div>

        {/* Ranking de Vendedores / Equipe */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Produtividade por Vendedor
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Receita ganha e taxa de conversão
              </p>
            </div>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3">
            {repPerformance.map((rep) => (
              <div key={rep.rep} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {rep.rep}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyBRL(rep.wonValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span>{rep.won} ganhos / {rep.total} total</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{rep.conversionRate}% conversão</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
