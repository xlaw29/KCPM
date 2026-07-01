/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Clock, 
  Video, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Activity,
  UserCheck
} from 'lucide-react';
import { AlertEvent, AppTab } from '../types';

interface AlertsViewProps {
  alerts: AlertEvent[];
  onAcknowledgeAlert: (id: string, name: string) => void;
  setActiveTab: (tab: AppTab) => void;
}

export default function AlertsView({
  alerts,
  onAcknowledgeAlert,
  setActiveTab
}: AlertsViewProps) {
  
  // Filter states
  const [timeframe, setTimeframe] = useState('24 giờ qua');
  const [selectedType, setSelectedType] = useState<'all' | 'fire' | 'smoke'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState('Tất cả');
  const [selectedZalo, setSelectedZalo] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Filter logic
  const filteredAlerts = alerts.filter((alert) => {
    // Search
    const matchesSearch = alert.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          alert.cameraName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type Filter
    const matchesType = selectedType === 'all' || alert.type === selectedType;
    
    // Severity Filter
    const matchesSeverity = selectedSeverity === 'Tất cả' || 
                            alert.severity.toLowerCase() === selectedSeverity.toLowerCase();
    
    // Zalo Filter
    const matchesZalo = selectedZalo === 'Tất cả' ||
                        (selectedZalo === 'Thành công' && alert.zaloSuccess === 'success') ||
                        (selectedZalo === 'Lỗi' && alert.zaloSuccess === 'error');

    return matchesSearch && matchesType && matchesSeverity && matchesZalo;
  });

  // Pagination calculations
  const totalItems = filteredAlerts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAlerts.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* FILTERS TOOLBAR PANEL */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-end gap-5 shadow-lg relative">
        {/* Search inside filter */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider pl-1">Tìm kiếm sự cố</label>
          <div className="relative flex items-center transition-all duration-200 glass-panel bg-white/5 rounded-xl border-outline-variant/30 focus-within:ring-2 focus-within:ring-brand-cyan/50 focus-within:border-transparent">
            <Search className="w-4 h-4 absolute left-4 text-on-surface-variant/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-outline/40 focus:ring-0 outline-none"
              placeholder="Nhập ID, camera cần tìm..."
            />
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider pl-1">Khoảng thời gian</label>
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-brand-cyan"
          >
            <option>24 giờ qua</option>
            <option>7 ngày qua</option>
            <option>30 ngày qua</option>
            <option>Tùy chọn...</option>
          </select>
        </div>

        {/* Alarm Type Tabs */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider pl-1">Loại sự cố</label>
          <div className="flex bg-surface-lowest rounded-xl p-1 border border-white/5">
            <button 
              onClick={() => setSelectedType('all')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                selectedType === 'all' ? 'bg-brand-blue text-white' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setSelectedType('fire')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                selectedType === 'fire' ? 'bg-brand-blue text-white' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Phát hiện Lửa
            </button>
            <button 
              onClick={() => setSelectedType('smoke')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                selectedType === 'smoke' ? 'bg-brand-blue text-white' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              Phát hiện Khói
            </button>
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider pl-1">Mức độ cảnh báo</label>
          <select 
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-brand-cyan"
          >
            <option>Tất cả</option>
            <option>critical</option>
            <option>high</option>
            <option>medium</option>
            <option>low</option>
          </select>
        </div>

        {/* Zalo dispatch status */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider pl-1">Zalo Notification</label>
          <select 
            value={selectedZalo}
            onChange={(e) => setSelectedZalo(e.target.value)}
            className="bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer focus:ring-2 focus:ring-brand-cyan"
          >
            <option>Tất cả</option>
            <option>Thành công</option>
            <option>Lỗi</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        <button 
          onClick={() => {
            setSearchQuery('');
            setSelectedType('all');
            setSelectedSeverity('Tất cả');
            setSelectedZalo('Tất cả');
          }}
          className="bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan-light px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border border-brand-cyan/20"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Đặt lại bộ lọc</span>
        </button>
      </div>

      {/* WARNINGS STREAM LIST CARDS */}
      <div className="space-y-4">
        {currentItems.length > 0 ? (
          currentItems.map((alertItem) => {
            const isCritical = alertItem.severity === 'critical' && !alertItem.acknowledged;
            return (
              <div
                key={alertItem.id}
                className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 flex flex-col md:flex-row items-stretch md:items-center p-3 gap-5 border shadow-lg ${
                  isCritical 
                    ? 'border-red-500/40 glow-red animate-pulse-subtle' 
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Image CCTV representation column */}
                <div className="w-full md:w-44 h-28 rounded-xl overflow-hidden relative flex-shrink-0 bg-surface-lowest">
                  {alertItem.imageUrl ? (
                    <img 
                      src={alertItem.imageUrl} 
                      className={`w-full h-full object-cover transition-all duration-500 ${isCritical ? 'scale-105 contrast-125 brightness-95' : 'grayscale-[20%]'}`}
                      referrerPolicy="no-referrer"
                      alt="CCTV snapshot"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/35 bg-surface-low">
                      <Video className="w-8 h-8 stroke-[1.5px]" />
                      <span className="text-[10px] uppercase font-bold mt-1">No Frame</span>
                    </div>
                  )}
                  {/* Subtle target thermal outline simulator */}
                  {isCritical && (
                    <div className="absolute inset-0 border-2 border-red-500 m-4 rounded animate-pulse"></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide ${
                    isCritical ? 'bg-red-500 text-white animate-bounce' : 'bg-surface-lowest/80 text-on-surface'
                  }`}>
                    {alertItem.type === 'fire' ? 'Live Hotspot' : 'CCTV Frame'}
                  </div>
                </div>

                {/* Info block layout columns */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  
                  {/* Col 1: Time & Camera */}
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-extrabold text-on-surface-variant/60 uppercase tracking-wider">Thời gian &amp; Camera</p>
                    <h4 className="font-bold text-white tracking-tight text-sm leading-tight">
                      {alertItem.timestamp} — <span className="font-mono text-xs font-medium text-on-surface-variant">{alertItem.date}</span>
                    </h4>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 font-medium">
                      <Video className="w-3.5 h-3.5 text-brand-blue" />
                      {alertItem.cameraName}
                    </p>
                  </div>

                  {/* Col 2: Incident Type & severity */}
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-extrabold text-on-surface-variant/60 uppercase tracking-wider">Loại &amp; Mức độ</p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        alertItem.type === 'fire' 
                          ? 'bg-red-500/15 text-red-400 border-red-500/20' 
                          : alertItem.type === 'smoke'
                          ? 'bg-brand-cyan/15 text-brand-cyan-light border-brand-cyan/20'
                          : 'bg-brand-orange/15 text-brand-orange border-brand-orange/20'
                      }`}>
                        {alertItem.type === 'fire' ? 'Phát hiện Lửa' : alertItem.type === 'smoke' ? 'Phát hiện Khói' : 'Vật thể lạ'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        alertItem.severity === 'critical' 
                          ? 'bg-red-500 text-white border-red-600' 
                          : alertItem.severity === 'high'
                          ? 'bg-brand-orange/20 text-brand-orange border-brand-orange/35'
                          : 'bg-surface-highest text-on-surface-variant border-white/5'
                      }`}>
                        {alertItem.severity}
                      </span>
                    </div>
                  </div>

                  {/* Col 3: Zalo dispatch state */}
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-extrabold text-on-surface-variant/60 uppercase tracking-wider">Trạng thái Zalo</p>
                    <div className={`flex items-center gap-1.5 font-bold text-xs ${
                      alertItem.zaloSuccess === 'success' 
                        ? 'text-brand-green' 
                        : alertItem.zaloSuccess === 'error'
                        ? 'text-red-400 animate-pulse-subtle'
                        : 'text-on-surface-variant/60'
                    }`}>
                      <CheckCircle className="w-4 h-4 stroke-[2.5px]" />
                      <span>{alertItem.zaloStatus}</span>
                    </div>
                  </div>

                  {/* Col 4: Action Acknowledge Verification */}
                  <div className="flex items-center justify-start lg:justify-end gap-3">
                    {alertItem.acknowledged ? (
                      <div className="flex items-center gap-1.5 text-brand-green bg-brand-green/10 px-3.5 py-2 rounded-xl border border-brand-green/15 text-xs font-bold">
                        <UserCheck className="w-4 h-4" />
                        <div className="text-left leading-none">
                          <p className="text-brand-green">Đã xác minh</p>
                          <p className="text-[9px] text-brand-green/70 mt-0.5 font-medium">Bởi {alertItem.acknowledgedBy || 'Hệ thống'}</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onAcknowledgeAlert(alertItem.id, 'Admin Tech')}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md ${
                          alertItem.severity === 'critical'
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10'
                            : 'bg-surface-highest hover:bg-white/10 text-white border border-white/5'
                        }`}
                      >
                        Xác nhận xử lý
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        window.alert(`Chi tiết ID: ${alertItem.id}\nCamera: ${alertItem.cameraName}\nTrạng thái: ${alertItem.acknowledged ? 'Đã xử lý' : 'Đang chờ xử lý'}`);
                      }}
                      className="p-2 hover:bg-surface-high rounded-xl text-on-surface-variant/60 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty Search results layout */
          <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <HelpCircle className="w-12 h-12 text-on-surface-variant/30 animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Không tìm thấy bản ghi nào</h4>
              <p className="text-xs text-on-surface-variant">Thử điều chỉnh lại các thanh lọc hoặc thanh tìm kiếm phía trên.</p>
            </div>
          </div>
        )}
      </div>

      {/* PAGINATION / FOOTER CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-4">
          <p className="text-xs text-on-surface-variant font-medium">
            Hiển thị <span className="font-bold text-white">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)}</span> trên <span className="font-bold text-white">{totalItems}</span> cảnh báo
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/5 bg-surface-high text-on-surface-variant/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-xs cursor-pointer transition-all ${
                  currentPage === page 
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20' 
                    : 'bg-surface-low text-on-surface-variant hover:text-white border border-white/5'
                }`}
              >
                {page}
              </button>
            ))}

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/5 bg-surface-high text-on-surface-variant/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
