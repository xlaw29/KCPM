/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Radio, RotateCw, Bell, LogOut, ShieldAlert } from 'lucide-react';
import { AppTab } from '../types';

interface TopbarProps {
  activeTab: AppTab;
  isSidebarCompact: boolean;
  onLogout: () => void;
  systemStatus: {
    server: boolean;
    sensors: boolean;
  };
}

export default function Topbar({ 
  activeTab, 
  isSidebarCompact, 
  onLogout,
  systemStatus 
}: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Determine dynamic title and search placeholder based on current screen
  const getTabDetails = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return {
          title: 'Dashboard Tổng Quan',
          subtitle: 'Giám sát & Báo cháy Zalo',
          placeholder: 'Tìm kiếm dữ liệu giám sát...',
        };
      case AppTab.CAMERA_MONITOR:
        return {
          title: 'Giám sát camera',
          subtitle: 'Trực quan luồng live và chuẩn đoán AI',
          placeholder: 'Tìm kiếm camera hoặc khu vực...',
        };
      case AppTab.ALERTS:
        return {
          title: 'Cảnh báo & Sự cố',
          subtitle: 'Luồng quản lý sự kiện và xác minh Zalo',
          placeholder: 'Tìm kiếm sự cố, camera...',
        };
      case AppTab.HISTORY:
        return {
          title: 'Lịch sử sự kiện',
          subtitle: 'Bản ghi log tự động toàn thời gian',
          placeholder: 'Tìm kiếm theo ID, camera...',
        };
      case AppTab.ZALO_CONFIG:
        return {
          title: 'Cấu hình Zalo Integration',
          subtitle: 'Kết nối Zalo OA và luồng gửi tin khẩn cấp',
          placeholder: 'Tìm kiếm thiết lập...',
        };
      case AppTab.SETTINGS:
        return {
          title: 'Cài đặt hệ thống',
          subtitle: 'Tham số AI Model và phân vùng lưu trữ',
          placeholder: 'Tìm kiếm cài đặt...',
        };
    }
  };

  const { title, subtitle, placeholder } = getTabDetails();

  return (
    <header 
      className={`h-16 fixed top-0 right-0 z-40 bg-surface-base/80 backdrop-blur-md border-b border-outline-variant/20 flex justify-between items-center px-8 transition-all duration-300 ${
        isSidebarCompact ? 'w-[calc(100%-80px)]' : 'w-[calc(100%-288px)]'
      }`}
    >
      {/* Title block */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-white leading-none">{title}</h2>
        <div className="hidden md:block h-5 w-px bg-outline-variant/30"></div>
        <p className="hidden md:block text-xs text-on-surface-variant font-medium opacity-85">{subtitle}</p>
      </div>

      {/* Actions and Profile */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative hidden lg:block">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-high border-none rounded-full py-2 pl-10 pr-4 text-xs w-64 text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all placeholder:text-on-surface-variant/40"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none" />
        </div>

        {/* Live Network Indicators */}
        <div className="flex items-center gap-2 bg-surface-low/60 p-1.5 rounded-full border border-white/5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-brand-green bg-brand-green/10">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping"></span>
            Server Live
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold text-brand-cyan-light bg-brand-cyan/10">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse-subtle"></span>
            Sensors Active
          </div>
        </div>

        {/* Refresh / Notifications */}
        <div className="flex items-center gap-2">
          <button className="hover:bg-surface-high rounded-full p-2.5 transition-colors cursor-pointer text-on-surface-variant hover:text-white" title="Đồng bộ hóa dữ liệu">
            <RotateCw className="w-4 h-4 animate-pulse-subtle" />
          </button>
          
          <div className="relative">
            <button className="hover:bg-surface-high rounded-full p-2.5 transition-colors cursor-pointer text-on-surface-variant hover:text-white">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Admin Card */}
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">Admin Tech</p>
            <p className="text-[10px] uppercase font-bold text-brand-cyan-light tracking-wide">Trực ca sáng</p>
          </div>
          <div className="relative group cursor-pointer">
            <img 
              className="w-9 h-9 rounded-full border-2 border-brand-blue/30 object-cover"
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
              referrerPolicy="no-referrer"
              alt="Admin Profile"
            />
            {/* Quick Profile Actions Overlay */}
            <div className="absolute right-0 mt-2 w-48 bg-surface-high rounded-xl border border-white/5 p-2 shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150">
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs font-bold text-white">Nguyễn Văn A</p>
                <p className="text-[10px] text-on-surface-variant">nguyen.a@smartfire.vn</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-brand-error-container/20 rounded-lg cursor-pointer transition-colors mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất hệ thống
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
