/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, History, Wallet, BarChart3, Store, Bot, Truck, Users, TrendingDown, Percent, LogOut, User as UserIcon, PackagePlus, RotateCcw } from 'lucide-react';
import StockAlert from '@/components/pos/StockAlert';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { indexdbUser } from '@/lib/indexdbUser';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const storeName = useSettingsStore(state => state.storeInfo.name);
  const currentUser = indexdbUser.getCurrentUser();
  
  const rawMenuItems = [
    { path: '/', icon: <LayoutDashboard />, label: 'Beranda', roles: ['admin'], color: 'text-[#6366F1]', bg: 'bg-[#6366F1]/10', activeColor: 'bg-indigo-600 text-white shadow-[#6366F1]/25' },
    { path: '/pos', icon: <ShoppingCart />, label: 'Kasir', roles: ['admin', 'kasir'], color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', activeColor: 'bg-emerald-600 text-white shadow-[#10B981]/25' },
    { path: '/restock', icon: <PackagePlus />, label: 'Masuk', roles: ['admin', 'gudang'], color: 'text-[#0EA5E9]', bg: 'bg-[#0EA5E9]/10', activeColor: 'bg-sky-600 text-white shadow-[#0EA5E9]/25' },
    { path: '/retur', icon: <RotateCcw />, label: 'Retur', roles: ['admin', 'gudang'], color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10', activeColor: 'bg-rose-600 text-white shadow-[#EF4444]/25' },
    { path: '/inventory', icon: <Package />, label: 'Produk', roles: ['admin', 'gudang'], color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', activeColor: 'bg-amber-600 text-white shadow-[#F59E0B]/25' },
    { path: '/suppliers', icon: <Truck />, label: 'Supplier', roles: ['admin', 'gudang'], color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10', activeColor: 'bg-purple-600 text-white shadow-[#8B5CF6]/25' },
    { path: '/expenses', icon: <TrendingDown />, label: 'Biaya', roles: ['admin'], color: 'text-[#D946EF]', bg: 'bg-[#D946EF]/10', activeColor: 'bg-fuchsia-600 text-white shadow-[#D946EF]/25' },
    { path: '/discounts', icon: <Percent />, label: 'Diskon', roles: ['admin'], color: 'text-[#EC4899]', bg: 'bg-[#EC4899]/10', activeColor: 'bg-pink-600 text-white shadow-[#EC4899]/25' },
    { path: '/customers', icon: <Users />, label: 'Pelanggan', roles: ['admin', 'kasir'], color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10', activeColor: 'bg-teal-600 text-white shadow-[#14B8A6]/25' },
    { path: '/debts', icon: <Wallet />, label: 'Hutang', roles: ['admin', 'kasir'], color: 'text-[#EC4899]', bg: 'bg-[#EC4899]/10', activeColor: 'bg-pink-600 text-white shadow-[#EC4899]/25' },
    { path: '/history', icon: <History />, label: 'Riwayat', roles: ['admin', 'kasir'], color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', activeColor: 'bg-blue-600 text-white shadow-[#3B82F6]/25' },
    { path: '/reports', icon: <BarChart3 />, label: 'Laporan', roles: ['admin'], color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10', activeColor: 'bg-violet-600 text-white shadow-[#A855F7]/25' },
    { path: '/settings', icon: <Store />, label: 'Toko', roles: ['admin'], color: 'text-[#64748B]', bg: 'bg-[#64748B]/10', activeColor: 'bg-slate-600 text-white shadow-[#64748B]/25' },
  ];

  const menuItems = rawMenuItems.filter(item => {
    const role = currentUser?.role || 'admin';
    return item.roles.includes(role);
  });

  return (
    <div className="flex flex-col min-h-[calc(var(--vh,1vh)*100)] bg-slate-100 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <Store size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight text-slate-900 dark:text-white tracking-tight">{storeName}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">Sistem Kasir · Tema High Density</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">{currentUser.name || 'User'}</div>
                  <div className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">{currentUser.role || 'kasir'}</div>
                </div>
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center font-extrabold text-xs text-indigo-700 dark:text-indigo-400 uppercase">
                  {(currentUser.name || 'User').slice(0, 2)}
                </div>
              </div>
              <button
                onClick={() => {
                  indexdbUser.logout();
                  navigate('/login');
                }}
                title="Logout"
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all flex items-center justify-center"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Scrollable Content Panel */}
      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 pb-28 md:pb-28 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <StockAlert />
          {children}
        </div>
      </main>

      {/* Bottom Floating Navigation for All Platforms - Balanced and Crisp */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-7xl px-2 z-50">
        <nav className="h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-[28px] flex items-center justify-start md:justify-center px-4 gap-2 overflow-x-auto scrollbar-none shadow-xl shadow-slate-200/50 dark:shadow-slate-950/60 transition-all select-none">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all py-1 px-2.5 rounded-2xl min-w-[64px] shrink-0",
                  isActive 
                    ? "scale-105" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95"
                )}
              >
                {/* Icon Container with very solid borders & styling for clear visibility in Light Mode */}
                <div className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 border",
                  isActive
                    ? cn(item.activeColor, "border-transparent shadow-md")
                    : "bg-slate-100 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200"
                )}>
                  <div className={cn(
                    "transition-transform duration-200",
                    isActive ? "scale-110 text-white" : "scale-100 text-slate-800 dark:text-slate-105",
                    "[&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[2.5]"
                  )}>
                    {item.icon}
                  </div>
                </div>
                {/* Labels with increased readability */}
                <span className={cn(
                  "text-[8px] tracking-tight leading-none truncate max-w-[62px] uppercase text-center mt-0.5",
                  isActive 
                    ? "font-extrabold text-slate-900 dark:text-white" 
                    : "font-black text-slate-700 dark:text-slate-300"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
