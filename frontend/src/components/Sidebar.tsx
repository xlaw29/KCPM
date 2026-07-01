/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  ShieldAlert, 
  History, 
  MessageSquareCode, 
  Settings, 
  Flame, 
  Siren 
} from 'lucide-react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isCompact: boolean;
  onEmergencyTrigger: () => void;
  onLogout: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCompact, 
  onEmergencyTrigger,
  onLogout
}: SidebarProps) {
  
  const menuItems = [
    { id: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppTab.CAMERA_MONITOR, label: 'Giám sát camera', icon: Video },
    { id: AppTab.ALERTS, label: 'Cảnh báo', icon: ShieldAlert, badge: 3 },
    { id: AppTab.HISTORY, label: 'Lịch sử', icon: History },
    { id: AppTab.ZALO_CONFIG, label: 'Cấu hình Telegram', icon: MessageSquareCode },
    { id: AppTab.SETTINGS, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside 
      className={`h-screen fixed left-0 top-0 bg-surface-lowest flex flex-col p-6 z-50 border-r border-outline-variant/10 shadow-lg transition-all duration-300 ${
        isCompact ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className={`flex items-center gap-3 mb-8 ${isCompact ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center text-brand-blue shadow-lg shadow-brand-blue/5">
          <Flame className="w-6 h-6 fill-current animate-pulse-subtle" />
        </div>
        {!isCompact && (
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Smart Fire</h1>
            <p className="text-[10px] uppercase font-bold text-brand-cyan-light tracking-wider">Hệ thống Giám sát</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group cursor-pointer ${
                isActive 
                  ? 'bg-brand-blue text-white font-bold scale-[0.98] shadow-md shadow-brand-blue/25' 
                  : 'text-on-surface-variant hover:text-white hover:bg-surface-highest/40'
              } ${isCompact ? 'justify-center' : ''}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
              
              {!isCompact && <span className="text-sm font-medium">{item.label}</span>}
              
              {/* Badge for Alerts count */}
              {item.badge && !isCompact && (
                <span className="ml-auto bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* Tooltip for Compact Mode */}
              {isCompact && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface-high text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-xl border border-white/5 z-50">
                  {item.label} {item.badge ? `(${item.badge})` : ''}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Emergency Alarm Button */}
      <div className="mt-auto flex flex-col gap-3">
        <button 
          onClick={onEmergencyTrigger}
          className={`w-full py-4 bg-brand-error-container hover:bg-red-700/35 text-red-200 border border-red-500/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 duration-150 ${
            isCompact ? 'px-0' : 'px-4'
          }`}
          style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.15)' }}
        >
          <Siren className="w-5 h-5 text-red-400 animate-bounce" />
          {!isCompact && <span className="text-sm tracking-wide">Báo động khẩn cấp</span>}
        </button>

        {/* Compact Sign Out Option */}
        {!isCompact && (
          <button 
            onClick={onLogout}
            className="text-xs text-on-surface-variant/50 hover:text-white text-center mt-2 cursor-pointer transition-colors"
          >
            Đăng xuất hệ thống
          </button>
        )}
      </div>
    </aside>
  );
}
