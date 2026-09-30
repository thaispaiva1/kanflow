/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { SalesDashboard } from './components/SalesDashboard';
import { SupplierManagement } from './components/SupplierManagement';
import { DealModal } from './components/DealModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { Deal, DealActivity, Supplier } from './types/crm';
import { DEFAULT_STAGES } from './data/initialData';
import { 
  fetchDeals, 
  createDeal, 
  updateDeal, 
  deleteDeal, 
  addDealActivity, 
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  purgeMockData 
} from './services/supabaseService';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function CRMContent() {
  const { isAuthenticated, isAdmin, isCommercial } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<'kanban' | 'dashboard' | 'suppliers'>('kanban');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null);
  const [initialStageForNewDeal, setInitialStageForNewDeal] = useState('prospecting');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Sidebar collapse & mobile drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch deals and suppliers
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsData, suppliersData] = await Promise.all([
        fetchDeals(),
        fetchSuppliers()
      ]);
      setDeals(dealsData);
      setSuppliers(suppliersData);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    purgeMockData();
    loadData();
  }, [loadData]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Open modal to create deal at specific stage
  const handleNewDealAtStage = (_stageId?: string) => {
    if (!isCommercial) {
      showToast('Apenas o perfil Comercial tem permissão para cadastrar novas oportunidades.', 'info');
      return;
    }
    setDealToEdit(null);
    setInitialStageForNewDeal('prospecting');
    setIsDealModalOpen(true);
  };

  // Open modal from navbar or sidebar
  const handleOpenNewDeal = () => {
    if (!isCommercial) {
      showToast('Apenas o perfil Comercial tem permissão para cadastrar novas oportunidades.', 'info');
      return;
    }
    setDealToEdit(null);
    setInitialStageForNewDeal('prospecting');
    setIsDealModalOpen(true);
  };

  // Open edit deal
  const handleEditDeal = (deal: Deal) => {
    setDealToEdit(deal);
    setIsDealModalOpen(true);
  };

  // Save deal (create or update)
  const handleSaveDeal = async (dealData: any) => {
    if (dealToEdit) {
      const updated = await updateDeal(dealToEdit.id, dealData);
      setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
      showToast(`Oportunidade "${updated.title}" atualizada com sucesso!`);
    } else {
      if (!isCommercial) {
        showToast('Apenas o perfil Comercial tem permissão para cadastrar novas oportunidades.', 'info');
        return;
      }
      const created = await createDeal({
        ...dealData,
        stage_id: 'prospecting'
      });
      setDeals(prev => [created, ...prev]);
      showToast(`Nova oportunidade "${created.title}" inserida em Prospecção!`);
    }
  };

  // Delete deal
  const handleDeleteDeal = async (id: string) => {
    await deleteDeal(id);
    setDeals(prev => prev.filter(d => d.id !== id));
    showToast('Oportunidade removida do funil.', 'info');
  };

  // Add activity to a deal
  const handleAddActivity = async (dealId: string, activity: Omit<DealActivity, 'id' | 'deal_id' | 'created_at'>) => {
    const newAct = await addDealActivity(dealId, activity);
    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        const activities = d.activities ? [newAct, ...d.activities] : [newAct];
        return { ...d, activities };
      }
      return d;
    }));
    if (dealToEdit && dealToEdit.id === dealId) {
      setDealToEdit(prev => prev ? {
        ...prev,
        activities: prev.activities ? [newAct, ...prev.activities] : [newAct]
      } : null);
    }
    showToast('Atividade registrada com sucesso!');
  };

  // Move deal to new stage (Kanban drag or arrow buttons)
  const handleMoveDealStage = async (dealId: string, newStageId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    const targetStage = DEFAULT_STAGES.find(s => s.id === newStageId);
    const stageName = targetStage ? targetStage.name : newStageId;

    // Optimistic UI update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: newStageId } : d));

    try {
      await updateDeal(dealId, { stage_id: newStageId });
      showToast(`Oportunidade movida para "${stageName}"`);
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  // ===================================
  // SUPPLIER ACTIONS
  // ===================================
  const handleAddSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isCommercial) {
      showToast('Apenas usuários com perfil Comercial podem cadastrar novos clientes.', 'info');
      return;
    }
    const created = await createSupplier(supplierData);
    setSuppliers(prev => [created, ...prev]);
    showToast(`Empresa/Cliente "${created.name}" cadastrado(a) com sucesso!`);
  };

  const handleUpdateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const updated = await updateSupplier(id, updates);
    setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
    showToast(`Empresa/Cliente "${updated.name}" atualizado(a).`);
  };

  const handleDeleteSupplier = async (id: string) => {
    await deleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    showToast('Empresa/Cliente removido(a) com sucesso.', 'info');
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex font-sans transition-colors">
      {/* Barra Lateral (Sidebar) com Quadro, Dash e Fornecedores */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewDeal={handleOpenNewDeal}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        dealsCount={deals.length}
        suppliersCount={suppliers.length}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Layout (Offsetted by Sidebar on Desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
      }`}>
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onOpenNewDeal={handleOpenNewDeal}
          onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Carregando informações do sistema...</span>
            </div>
          ) : (
            <>
              {currentTab === 'kanban' && (
                <KanbanBoard
                  stages={DEFAULT_STAGES}
                  deals={deals}
                  onEditDeal={handleEditDeal}
                  onNewDealAtStage={handleNewDealAtStage}
                  onMoveDealStage={handleMoveDealStage}
                />
              )}

              {currentTab === 'dashboard' && (
                <SalesDashboard
                  deals={deals}
                  stages={DEFAULT_STAGES}
                />
              )}

              {currentTab === 'suppliers' && (
                <SupplierManagement
                  suppliers={suppliers}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg text-xs font-semibold">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-sky-400 dark:text-sky-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Deal Modal */}
      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => {
          setIsDealModalOpen(false);
          setDealToEdit(null);
        }}
        dealToEdit={dealToEdit}
        stages={DEFAULT_STAGES}
        onSave={handleSaveDeal}
        onDelete={handleDeleteDeal}
        onAddActivity={handleAddActivity}
        initialStageId={initialStageForNewDeal}
        companies={suppliers}
      />

      {/* Modal de Gerenciamento de Usuários e Acessos */}
      {isAdmin && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CRMContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
