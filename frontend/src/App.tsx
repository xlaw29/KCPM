/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AppTab,
  Camera,
  AlertEvent,
  TelegramConfig,
  SystemSettings
} from './types';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import CameraMonitorView from './components/CameraMonitorView';
import AlertsView from './components/AlertsView';
import HistoryView from './components/HistoryView';
import TelegramConfigView from './components/TelegramConfigView';
import SettingsView from './components/SettingsView';
import { INITIAL_ALERTS } from './components/MockData';
import { sendTelegram, saveDetection, AccountUser } from './api';
import { Siren, AlertTriangle, ShieldCheck, X, CheckCircle } from 'lucide-react';

export default function App() {
  // Authentication status
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Tai khoan dang dang nhap (lay tu CSDL).
  const [currentUser, setCurrentUser] = useState<AccountUser | null>(null);
  
  // App navigation tabs
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  
  // State lists
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>(INITIAL_ALERTS);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-01');

  // Cau hinh Telegram - luu co dinh trong localStorage de khong phai nhap lai.
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    try {
      const saved = localStorage.getItem('telegramConfig');
      if (saved) return JSON.parse(saved) as TelegramConfig;
    } catch {
      // bo qua neu localStorage loi
    }
    return { botToken: '', chatId: '', autoSendEnabled: false };
  });

  // General System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    fireConfidence: 40,
    smokeConfidence: 35,
    processingFps: 15,
    notifyFrequency: 'Gửi cách nhau 1 phút',
    saveImages: true,
    saveVideos: true,
    logRetention: '90 ngày',
    theme: 'dark',
    sidebarCompact: false,
    language: 'Tiếng Việt (VN)',
  });

  // Emergency overlay trigger state
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyTimer, setEmergencyTimer] = useState<number | null>(null);

  // In-app floating custom toast notifications stack
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warn' | 'info' }[]>([]);

  // Show dynamic notification helper
  const triggerToast = (message: string, type: 'success' | 'warn' | 'info' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // State manipulation callbacks
  const handleAddCamera = (newCam: Omit<Camera, 'status'>) => {
    const cameraWithStatus: Camera = {
      ...newCam,
      status: 'online', // New cameras start active
    };
    setCameras(prev => [cameraWithStatus, ...prev]);
    triggerToast(`Đã cấu hình thêm Camera mới: ${newCam.id} thành công!`, 'success');
  };

  const handleAddAlert = (newAlert: AlertEvent) => {
    setAlerts(prev => [newAlert, ...prev]);
    triggerToast(`[CẢNH BÁO MỚI] Phát hiện ${newAlert.type === 'fire' ? 'Lửa' : 'Khói'} tại ${newAlert.cameraName}!`, 'warn');

    // Luu co dinh su kien vao CSDL SQLite o backend.
    const severityMap: Record<string, number> = { critical: 0.9, high: 0.75, medium: 0.55, low: 0.4 };
    saveDetection({
      type: newAlert.type,
      confidence: severityMap[newAlert.severity] ?? 0.5,
      camera_name: newAlert.cameraName,
      detected_classes: [newAlert.type],
      source: 'camera',
      image: newAlert.imageUrl?.startsWith('data:image/') ? newAlert.imageUrl : undefined,
      user_id: currentUser?.id,
    }).catch(() => {
      // khong chan luong neu backend loi; chi bo qua viec luu.
    });
  };

  const handleAcknowledgeAlert = (id: string, operatorName: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          acknowledged: true,
          acknowledgedBy: operatorName
        };
      }
      return a;
    }));
    triggerToast(`Đã phê duyệt xác minh xử lý cho sự cố: ${id}`, 'success');
  };


  const handleSaveTelegramConfig = (cfg: TelegramConfig) => {
    setTelegramConfig(cfg);
    // Luu co dinh: lan sau mo lai trang van con, khong phai nhap lai.
    try {
      localStorage.setItem('telegramConfig', JSON.stringify(cfg));
    } catch {
      // bo qua neu localStorage khong dung duoc
    }
    triggerToast('Đã lưu cố định cấu hình Telegram! Lần sau không cần nhập lại.', 'success');
  };

  const handleSendTelegramTest = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      triggerToast('Chưa có Bot Token hoặc Chat ID. Hãy lưu cấu hình trước.', 'warn');
      return;
    }
    try {
      const r = await sendTelegram({
        botToken: telegramConfig.botToken,
        chatId: telegramConfig.chatId,
        message: '🔔 [Smart Fire] Tin nhắn thử nghiệm kết nối Telegram thành công.',
      });
      if (r.ok) triggerToast('Đã gửi Telegram thử thành công! Kiểm tra điện thoại.', 'success');
      else triggerToast(`Gửi Telegram thất bại: ${r.error || 'kiểm tra token/chat_id'}`, 'warn');
    } catch (err) {
      triggerToast(`Lỗi gửi Telegram: ${err instanceof Error ? err.message : 'không xác định'}`, 'warn');
    }
  };

  const handleSaveSystemSettings = (updatedSettings: SystemSettings) => {
    setSystemSettings(updatedSettings);
    triggerToast('Đã lưu cấu hình thiết lập AI Edge và vùng nhớ thành công!', 'success');
  };

  const handleTriggerEmergency = () => {
    setEmergencyActive(true);
    triggerToast('[KHẨN CẤP] Đã kích hoạt hệ thống còi báo động khẩn cấp và bắn Zalo thông báo!', 'warn');
  };

  const handleDeactivateEmergency = () => {
    setEmergencyActive(false);
    triggerToast('Đã ngắt còi báo động khẩn cấp. Hệ thống trở về trạng thái giám sát.', 'success');
  };

  // Switch tabs
  const handleSetActiveTab = (tab: AppTab) => {
    setActiveTab(tab);
  };

  // Render view router based on selected menu
  const renderActiveView = () => {
    switch (activeTab) {
      case AppTab.DASHBOARD:
        return (
          <DashboardView 
            cameras={cameras}
            alerts={alerts}
            setActiveTab={handleSetActiveTab}
            setSelectedCameraId={setSelectedCameraId}
            onEmergencyTrigger={handleTriggerEmergency}
          />
        );
      case AppTab.CAMERA_MONITOR:
        return (
          <CameraMonitorView
            cameras={cameras}
            selectedCameraId={selectedCameraId}
            setSelectedCameraId={setSelectedCameraId}
            onAddCamera={handleAddCamera}
            onAddAlert={handleAddAlert}
            setActiveTab={handleSetActiveTab}
            systemSettings={systemSettings}
            telegramConfig={telegramConfig}
            onNotify={triggerToast}
          />
        );
      case AppTab.ALERTS:
        return (
          <AlertsView 
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            setActiveTab={handleSetActiveTab}
          />
        );
      case AppTab.HISTORY:
        return (
          <HistoryView 
            alerts={alerts}
          />
        );
      case AppTab.ZALO_CONFIG:
        return (
          <TelegramConfigView
            config={telegramConfig}
            onSaveConfig={handleSaveTelegramConfig}
            onSendTestMessage={handleSendTelegramTest}
          />
        );
      case AppTab.SETTINGS:
        return (
          <SettingsView 
            settings={systemSettings}
            onSaveSettings={handleSaveSystemSettings}
          />
        );
      default:
        return <div>View not implemented.</div>;
    }
  };

  // If user is not logged in, show Login View (Screen 1)
  if (!isLoggedIn) {
    return <LoginView onLogin={(user) => {
      setCurrentUser(user);
      setIsLoggedIn(true);
      triggerToast(`Chào mừng ${user.full_name || user.email} đã đăng nhập hệ thống Smart Fire!`, 'success');
    }} />;
  }

  const isCompact = systemSettings.sidebarCompact;

  return (
    <div className={`min-h-screen bg-surface-base text-on-surface flex bg-aurora selection:bg-brand-blue selection:text-white ${
      systemSettings.theme === 'light' ? 'light-mode-theme' : ''
    }`}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        isCompact={isCompact}
        onEmergencyTrigger={handleTriggerEmergency}
        onLogout={() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setActiveTab(AppTab.DASHBOARD);
        }}
      />

      {/* Main Body Frame */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
        isCompact ? 'pl-20' : 'pl-72'
      }`}>
        
        {/* Sticky Topbar */}
        <Topbar 
          activeTab={activeTab}
          isSidebarCompact={isCompact}
          onLogout={() => setIsLoggedIn(false)}
          systemStatus={{ server: true, sensors: true }}
        />

        {/* Dynamic Route Screen Canvas */}
        <main className="flex-1 pt-24 pb-12 px-8 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* EMERGENCY SYSTEM-WIDE RED DIALOG OVERLAY */}
      {emergencyActive && (
        <div className="fixed inset-0 bg-red-950/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6 animate-pulse-subtle">
          <div className="max-w-2xl w-full glass-panel border-red-500/50 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
            
            {/* Ambient flashing glow */}
            <div className="absolute -inset-10 bg-red-600/10 blur-3xl animate-pulse pointer-events-none"></div>

            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 animate-bounce border border-red-400/30">
              <Siren className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
              Kích hoạt báo động khẩn cấp!
            </h2>
            <p className="text-xs uppercase font-extrabold text-red-400 tracking-widest mb-6">
              Hệ thống phòng cháy toàn phân khu
            </p>

            <div className="bg-black/40 border border-red-500/20 rounded-2xl p-5 mb-8 w-full text-left space-y-3.5">
              <div className="flex items-center gap-3 text-red-200 text-xs font-bold border-b border-white/5 pb-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <span>CÁC THAO TÁC ĐANG ĐƯỢC TỰ ĐỘNG THỰC THI:</span>
              </div>
              <ul className="space-y-2 text-xs text-on-surface-variant font-medium">
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Gửi đồng loạt tin nhắn SMS &amp; Zalo khẩn cấp tới danh sách 3 Quản trị trực ca.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Bật còi hú và kích hoạt hệ thống phát loa báo động tòa nhà.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                  Gửi lệnh liên thông báo động trực tiếp tới cơ quan PCCC gần nhất.
                </li>
              </ul>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={handleDeactivateEmergency}
                className="flex-1 py-4 bg-white hover:bg-gray-100 text-red-950 font-extrabold text-xs rounded-xl tracking-wide uppercase shadow-lg transition-colors cursor-pointer"
              >
                Hủy báo động và Tắt loa hú
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SYSTEM TOASTS CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl flex items-start gap-3 border animate-status-glow ${
              toast.type === 'warn'
                ? 'bg-red-500/10 text-red-200 border-red-500/30'
                : toast.type === 'info'
                ? 'bg-brand-cyan/15 text-brand-cyan-light border-brand-cyan/35'
                : 'bg-brand-green/10 text-brand-green border-brand-green/25'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'warn' ? (
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
              ) : toast.type === 'info' ? (
                <ShieldCheck className="w-4.5 h-4.5 text-brand-cyan-light" />
              ) : (
                <CheckCircle className="w-4.5 h-4.5 text-brand-green" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="shrink-0 hover:opacity-80 text-on-surface-variant cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
