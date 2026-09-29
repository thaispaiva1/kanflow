import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  KanbanSquare, 
  LayoutDashboard, 
  Building2, 
  Settings, 
  LogOut, 
  Plus, 
  ShieldCheck, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'kanban' | 'dashboard' | 'suppliers';
  setCurrentTab: (tab: 'kanban' | 'dashboard' | 'suppliers') => void;
  onOpenNewDeal: () => void;
  onOpenAdminSettings: () => void;
  isSupabaseConnected: boolean;
  dealsCount: number;
  suppliersCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewDeal,
  onOpenAdminSettings,
  isSupabaseConnected,
  dealsCount,
  suppliersCount,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, isAdmin, isCommercial, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      id: 'kanban' as const,
      label: 'Quadro Kanban',
      badge: dealsCount,
      icon: KanbanSquare,
      description: 'Gestão visual do funil'
    },
    {
      id: 'dashboard' as const,
      label: isCommercial ? 'Indicadores de Prospecção' : 'Dashboard de Vendas',
      icon: LayoutDashboard,
      description: isCommercial ? 'Métricas de prospecção' : 'Gráficos e faturamento'
    },
    {
      id: 'suppliers' as const,
      label: 'Empresas / Clientes',
      badge: suppliersCount,
      icon: Building2,
      description: 'Cadastro de contatos e dados'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand / Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              KF
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white leading-tight">
                Kanflow
              </span>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Action Button (Nova Oportunidade) - Exclusivo para Comercial */}
        {isCommercial && (
          <div className="p-3">
            <button
              onClick={() => {
                onOpenNewDeal();
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all cursor-pointer ${
                isCollapsed && !isMobileOpen ? 'px-0' : ''
              }`}
              title="Cadastrar Nova Oportunidade"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Nova Oportunidade</span>}
            </button>
          </div>
        )}

        {/* Navigation Items (Quadro, Dash, Fornecedores) */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white'
                } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Database & Admin Status Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {/* Status Badge - Visível EXCLUSIVAMENTE para administradores */}
          {isAdmin && (
            (!isCollapsed || isMobileOpen) ? (
              <div className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-neutral-600 dark:text-neutral-300 truncate font-medium">
                    {isSupabaseConnected ? 'Supabase Conectado' : 'Modo Banco Local'}
                  </span>
                </div>
                <Database className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </div>
            ) : (
              <div className="flex justify-center py-1" title={isSupabaseConnected ? 'Supabase Conectado' : 'Modo Banco Local'}>
                <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </div>
            )
          )}

          {/* Admin Settings Button */}
          {isAdmin && (
            <button
              onClick={() => {
                onOpenAdminSettings();
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group ${
                isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
              }`}
              title="Configurações do Gerenciador (Supabase e Logins)"
            >
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>Configurações</span>}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
            }`}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-600 shrink-0" />
            )}
            {(!isCollapsed || isMobileOpen) && (
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            )}
          </button>

          {/* User Profile Card & Logout */}
          <div className={`pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between ${
            isCollapsed && !isMobileOpen ? 'flex-col gap-2' : ''
          }`}>
            <div className={`flex items-center gap-2.5 overflow-hidden ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}>
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-200 shrink-0">
                {isAdmin ? <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <User className="w-4 h-4" />}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {user?.name || user?.username}
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate">
                    {user?.roleLabel || (isAdmin ? 'Admin' : 'Comercial')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
