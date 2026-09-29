import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Menu, 
  Plus, 
  Sun, 
  Moon,
  Building2,
  KanbanSquare,
  LayoutDashboard
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'kanban' | 'dashboard' | 'suppliers';
  onOpenNewDeal: () => void;
  onOpenAdminSettings: () => void;
  onToggleMobileSidebar: () => void;
  isSupabaseConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenNewDeal,
  onOpenAdminSettings,
  onToggleMobileSidebar,
  isSupabaseConnected
}) => {
  const { user, isAdmin, isCommercial, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tabLabels = {
    kanban: { label: 'Quadro Kanban', icon: KanbanSquare, desc: 'Funil Visual de Oportunidades' },
    dashboard: { 
      label: isCommercial ? 'Indicadores de Prospecção' : 'Dashboard de Vendas', 
      icon: LayoutDashboard, 
      desc: isCommercial ? 'Métricas de Prospecção e Entrada de Leads' : 'Métricas e Gráficos de Faturamento' 
    },
    suppliers: { label: 'Empresas / Clientes', icon: Building2, desc: 'Cadastro com CNPJ/CPF, E-mail, Contato e Telefone' }
  };

  const currentTabInfo = tabLabels[currentTab];
  const TabIcon = currentTabInfo.icon;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Mobile trigger & Current Section Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            type="button"
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TabIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight">
                {currentTabInfo.label}
              </h1>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight hidden sm:block">
                {currentTabInfo.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Deal Button - Exclusivo para Comercial */}
          {isCommercial ? (
            <button
              onClick={onOpenNewDeal}
              className="flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Oportunidade</span>
              <span className="sm:hidden">Novo</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              Modo Gestão (Admin)
            </span>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Alternar tema"
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
