/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Download, 
  Video, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { AlertEvent } from '../types';

interface HistoryViewProps {
  alerts: AlertEvent[];
}

export default function HistoryView({ alerts }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const resolvedLogs = alerts.filter(a => {
    const matchesSearch = a.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.cameraName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || a.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleExport = (format: string) => {
    alert(`Đã xuất báo cáo lịch sử sự cố định dạng ${format} thành công! File lưu trữ được tải trực tiếp về thiết bị quản trị viên.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Action Toolbar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Search bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ID, camera, người xử lý..."
              className="bg-surface-high text-xs rounded-xl pl-10 pr-4 py-2.5 w-full text-white outline-none focus:ring-2 focus:ring-brand-blue border border-white/5"
            />
          </div>

          {/* Type filter */}
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-surface-high border border-white/5 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer"
          >
            <option value="all">Tất cả sự cố</option>
            <option value="fire">Chỉ Phát hiện Lửa</option>
            <option value="smoke">Chỉ Phát hiện Khói</option>
            <option value="suspect">Chỉ Vật thể lạ</option>
          </select>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('Excel')}
            className="bg-brand-green/10 hover:bg-brand-green/20 text-brand-green border border-brand-green/25 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          <button 
            onClick={() => handleExport('PDF')}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Tải Báo cáo PDF</span>
          </button>
        </div>
      </div>

      {/* Structured Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Nhật ký sự kiện lưu trữ</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Bản ghi hệ thống phục vụ công tác thanh tra PCCC</p>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">Tổng số bản ghi: <span className="font-bold text-white">{resolvedLogs.length}</span></span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-high/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã sự kiện</th>
                <th className="px-6 py-4">Ngày ghi nhận</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Nguồn camera</th>
                <th className="px-6 py-4">Sự kiện</th>
                <th className="px-6 py-4">Người xác minh</th>
                <th className="px-6 py-4">Zalo Dispatch</th>
                <th className="px-6 py-4 text-right">Chi tiết log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {resolvedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-brand-blue">{log.id}</td>
                  <td className="px-6 py-4 font-mono">{log.date}</td>
                  <td className="px-6 py-4 font-mono font-medium text-white">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-white">{log.cameraName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      log.type === 'fire' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : log.type === 'smoke'
                        ? 'bg-brand-cyan/10 text-brand-cyan-light border-brand-cyan/20'
                        : 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                    }`}>
                      {log.type === 'fire' ? 'Lửa' : log.type === 'smoke' ? 'Khói' : 'Vật thể lạ'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.acknowledged ? (
                      <span className="text-brand-green font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {log.acknowledgedBy || 'Nguyễn Văn A'}
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Chưa xử lý
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-on-surface-variant font-medium">{log.zaloStatus}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => alert(`Chi tiết nhật ký sự cố ${log.id}:\n- Camera phát hiện: ${log.cameraName}\n- Thời điểm: ${log.timestamp} ngày ${log.date}\n- Xác minh xử lý: ${log.acknowledged ? `Hoàn tất bởi ${log.acknowledgedBy}` : 'Đang chờ xử lý'}`)}
                      className="text-brand-cyan-light hover:underline font-bold"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
