/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CheckCircle, 
  Video, 
  Network, 
  AlertTriangle, 
  MessageSquare, 
  ArrowUp, 
  WifiOff, 
  Cpu, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera, AlertEvent, AppTab } from '../types';

interface DashboardViewProps {
  cameras: Camera[];
  alerts: AlertEvent[];
  setActiveTab: (tab: AppTab) => void;
  setSelectedCameraId: (id: string) => void;
  onEmergencyTrigger: () => void;
}

const CHART_DATA = [
  { time: '00:00', 'Phát hiện Lửa': 1, 'Phát hiện Khói': 3 },
  { time: '02:00', 'Phát hiện Lửa': 0, 'Phát hiện Khói': 2 },
  { time: '04:00', 'Phát hiện Lửa': 0, 'Phát hiện Khói': 1 },
  { time: '06:00', 'Phát hiện Lửa': 1, 'Phát hiện Khói': 1 },
  { time: '08:00', 'Phát hiện Lửa': 2, 'Phát hiện Khói': 4 },
  { time: '10:00', 'Phát hiện Lửa': 3, 'Phát hiện Khói': 5 },
  { time: '12:00', 'Phát hiện Lửa': 6, 'Phát hiện Khói': 4 }, // Peak
  { time: '14:00', 'Phát hiện Lửa': 2, 'Phát hiện Khói': 3 },
  { time: '16:00', 'Phát hiện Lửa': 1, 'Phát hiện Khói': 2 },
  { time: '18:00', 'Phát hiện Lửa': 0, 'Phát hiện Khói': 1 },
  { time: '20:00', 'Phát hiện Lửa': 0, 'Phát hiện Khói': 2 },
  { time: '22:00', 'Phát hiện Lửa': 1, 'Phát hiện Khói': 1 },
  { time: '23:59', 'Phát hiện Lửa': 1, 'Phát hiện Khói': 2 },
];

export default function DashboardView({
  cameras,
  alerts,
  setActiveTab,
  setSelectedCameraId,
  onEmergencyTrigger
}: DashboardViewProps) {

  // Calculate live stats
  const totalCameras = cameras.length;
  const activeCameras = cameras.filter(c => c.status !== 'offline').length;
  const offlineCameras = totalCameras - activeCameras;
  
  const todayAlertsCount = alerts.length;
  const resolvedAlertsCount = alerts.filter(a => a.acknowledged).length;
  const pendingAlertsCount = todayAlertsCount - resolvedAlertsCount;

  const sentZaloCount = alerts.filter(a => a.zaloSuccess === 'success').length;

  return (
    <div className="space-y-6">
      {/* Dynamic Status Banner */}
      <div 
        className="w-full rounded-2xl p-5 bg-brand-cyan/10 border border-brand-cyan/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-status-glow"
        style={{ boxShadow: '0 0 20px rgba(3, 181, 211, 0.08)' }}
      >
        <div className="flex items-center gap-4">
          <div className="bg-brand-cyan p-3 rounded-full">
            <CheckCircle className="w-6 h-6 text-surface-lowest stroke-[2.5px]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-cyan-light">Hệ thống đang giám sát bình thường</h3>
            <p className="text-xs text-on-surface-variant/80 mt-1">
              Cập nhật lần cuối: <span className="font-mono text-white font-medium">10:45:12</span> — Tất cả <span className="font-bold text-white">{activeCameras}/{totalCameras}</span> camera đã được liên kết hoạt động ổn định.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className="px-4 py-2 bg-surface-high hover:bg-surface-highest text-white rounded-xl text-xs font-bold border border-white/5 cursor-pointer transition-colors whitespace-nowrap active:scale-95"
        >
          Xem chi tiết nhật ký
        </button>
      </div>

      {/* Grid for 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Cameras */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">Tổng camera</p>
            <h4 className="text-3xl font-extrabold text-brand-blue tracking-tight">{totalCameras}</h4>
            <p className="text-[10px] text-brand-cyan flex items-center gap-1 font-bold">
              <ArrowUp className="w-3 h-3" />
              +2 so với tháng trước
            </p>
          </div>
          <div className="bg-brand-blue/10 p-3.5 rounded-xl border border-brand-blue/15 text-brand-blue">
            <Video className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active / Offline */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">Đang hoạt động</p>
            <h4 className="text-3xl font-extrabold text-brand-cyan-light tracking-tight">{activeCameras}</h4>
            {offlineCameras > 0 ? (
              <p className="text-[10px] text-red-400 flex items-center gap-1 font-bold animate-pulse-subtle">
                <WifiOff className="w-3 h-3" />
                {offlineCameras} camera mất tín hiệu
              </p>
            ) : (
              <p className="text-[10px] text-brand-green flex items-center gap-1 font-bold">
                100% camera trực tuyến
              </p>
            )}
          </div>
          <div className="bg-brand-cyan/10 p-3.5 rounded-xl border border-brand-cyan/15 text-brand-cyan-light">
            <Network className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Warnings Today */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">Cảnh báo hôm nay</p>
            <h4 className="text-3xl font-extrabold text-brand-green tracking-tight">{todayAlertsCount}</h4>
            <p className="text-[10px] text-brand-green flex items-center gap-1 font-bold">
              <CheckCircle className="w-3 h-3" />
              Đã xử lý xong {resolvedAlertsCount}/{todayAlertsCount}
            </p>
          </div>
          <div className="bg-brand-green/10 p-3.5 rounded-xl border border-brand-green/15 text-brand-green">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Zalo Notifications */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">Đã gửi Zalo</p>
            <h4 className="text-3xl font-extrabold text-white tracking-tight">{sentZaloCount}</h4>
            <p className="text-[10px] text-on-surface-variant/70 font-medium">
              Tỉ lệ phản hồi tự động 100%
            </p>
          </div>
          <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/15 text-blue-400">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Stats Block: Chart + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 24h Alerts Frequency Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Thống kê cảnh báo 24h</h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">Biểu đồ tần suất phát hiện lửa và khói thời gian thực</p>
            </div>
            <select className="bg-surface-high text-xs text-white border border-outline-variant/30 rounded-lg px-2.5 py-1.5 outline-none font-medium cursor-pointer">
              <option>Hôm nay</option>
              <option>Hôm qua</option>
              <option>7 ngày trước</option>
            </select>
          </div>

          <div className="h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3447" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  stroke="#8c909f" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#8c909f" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#191f31', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="Phát hiện Khói" fill="#4cd7f6" radius={[4, 4, 0, 0]} barSize={8} />
                <Bar dataKey="Phát hiện Lửa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-cyan-light animate-spin" style={{ animationDuration: '6s' }} />
            Trạng thái hệ thống AI Edge
          </h3>

          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {/* CPU usage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">CPU Usage</span>
                <span className="text-brand-cyan-light font-bold">25%</span>
              </div>
              <div className="h-2 w-full bg-surface-highest rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan-light rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            {/* RAM usage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">RAM Allocation</span>
                <span className="text-brand-green font-bold">40%</span>
              </div>
              <div className="h-2 w-full bg-surface-highest rounded-full overflow-hidden">
                <div className="h-full bg-brand-green rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>

            {/* Camera FPS */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">Camera Feed FPS (Average)</span>
                <span className="text-brand-blue font-bold">30 FPS</span>
              </div>
              <div className="h-2 w-full bg-surface-highest rounded-full overflow-hidden">
                <div className="h-full bg-brand-blue rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>

            {/* AI Performance Panel */}
            <div className="p-3.5 bg-surface-lowest/70 border border-white/5 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">Mô hình phân tích AI</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-white">YOLOv8-Fire</span>
                <span className="px-2 py-0.5 bg-brand-green/10 text-brand-green text-[9px] rounded font-extrabold tracking-wider uppercase border border-brand-green/20">
                  OPTIMIZED
                </span>
              </div>
            </div>

            {/* Server location */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant/60 pt-2 border-t border-white/5">
              <span className="w-1.5 h-1.5 bg-brand-cyan-light rounded-full animate-ping"></span>
              Server: Vietnam-South-Edge-01
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts Stream Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Sự kiện cảnh báo gần đây</h3>
            <p className="text-[11px] text-on-surface-variant/80 mt-0.5">Danh sách các phát hiện tự động trong 2 giờ qua</p>
          </div>
          <button 
            onClick={() => setActiveTab(AppTab.HISTORY)}
            className="text-xs font-bold text-brand-blue hover:text-brand-primary-container cursor-pointer transition-colors"
          >
            Tải log báo cáo CSV
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-high/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Thời gian</th>
                <th className="px-6 py-3.5">Camera nguồn</th>
                <th className="px-6 py-3.5">Loại cảnh báo</th>
                <th className="px-6 py-3.5">Mức độ</th>
                <th className="px-6 py-3.5">Trạng thái Zalo</th>
                <th className="px-6 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs">
              {alerts.slice(0, 3).map((alert) => (
                <tr key={alert.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-white">{alert.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-high flex items-center justify-center border border-white/5 text-on-surface-variant">
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white">{alert.cameraName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                      alert.type === 'fire' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : alert.type === 'smoke'
                        ? 'bg-brand-cyan/10 text-brand-cyan-light border-brand-cyan/20'
                        : 'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                    }`}>
                      {alert.type === 'fire' ? 'Phát hiện Lửa' : alert.type === 'smoke' ? 'Phát hiện Khói' : 'Vật thể lạ'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 ${
                      alert.severity === 'critical' ? 'text-red-400 font-extrabold' : alert.severity === 'high' ? 'text-brand-orange' : 'text-on-surface-variant'
                    }`}>
                      {alert.severity === 'critical' && <span className="inline-block w-1 h-1 rounded-full bg-red-400 animate-ping"></span>}
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${alert.zaloSuccess === 'success' ? 'bg-brand-green' : 'bg-red-400'}`}></span>
                      <span className="text-on-surface-variant">{alert.zaloStatus}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        // Find and set camera then redirect to monitor
                        const camId = alert.cameraName.split(' ')[0];
                        setSelectedCameraId(camId);
                        setActiveTab(AppTab.CAMERA_MONITOR);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-brand-blue hover:bg-brand-primary-container text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Chi tiết live
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
