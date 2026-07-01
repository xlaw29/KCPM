/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  Bell, 
  Database, 
  Globe, 
  Sparkles, 
  Check, 
  HelpCircle,
  Moon,
  Sun,
  Layout,
  Cpu,
  Monitor
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (updatedSettings: SystemSettings) => void;
}

export default function SettingsView({
  settings,
  onSaveSettings
}: SettingsViewProps) {
  const [fireConfidence, setFireConfidence] = useState(settings.fireConfidence);
  const [smokeConfidence, setSmokeConfidence] = useState(settings.smokeConfidence);
  const [processingFps, setProcessingFps] = useState(settings.processingFps);
  const [notifyFrequency, setNotifyFrequency] = useState(settings.notifyFrequency);
  const [saveImages, setSaveImages] = useState(settings.saveImages);
  const [saveVideos, setSaveVideos] = useState(settings.saveVideos);
  const [logRetention, setLogRetention] = useState(settings.logRetention);
  const [theme, setTheme] = useState(settings.theme);
  const [sidebarCompact, setSidebarCompact] = useState(settings.sidebarCompact);
  const [language, setLanguage] = useState(settings.language);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      onSaveSettings({
        fireConfidence,
        smokeConfidence,
        processingFps,
        notifyFrequency,
        saveImages,
        saveVideos,
        logRetention,
        theme,
        sidebarCompact,
        language
      });
      setIsSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PANEL 1: AI Model Threshold Params */}
        <section className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center text-brand-blue">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Ngưỡng tin cậy của AI Model</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Tinh chỉnh mức độ lọc nhiễu cảnh báo của camera</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Slider 1: Fire Confidence */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-bold">Độ nhạy phát hiện lửa (Confidence)</span>
                  <span className="font-mono text-brand-blue font-extrabold bg-brand-blue/10 px-2 py-0.5 rounded">{fireConfidence}%</span>
                </div>
                <input 
                  type="range"
                  min="30"
                  max="95"
                  value={fireConfidence}
                  onChange={(e) => setFireConfidence(parseInt(e.target.value))}
                  className="w-full accent-brand-blue h-1.5 bg-surface-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
                  <span>Nhạy nhất (30%)</span>
                  <span>Chính xác nhất (95%)</span>
                </div>
              </div>

              {/* Slider 2: Smoke Confidence */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-bold">Độ nhạy phát hiện khói (Confidence)</span>
                  <span className="font-mono text-brand-cyan-light font-extrabold bg-brand-cyan/10 px-2 py-0.5 rounded">{smokeConfidence}%</span>
                </div>
                <input 
                  type="range"
                  min="30"
                  max="95"
                  value={smokeConfidence}
                  onChange={(e) => setSmokeConfidence(parseInt(e.target.value))}
                  className="w-full accent-brand-cyan h-1.5 bg-surface-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
                  <span>Nhạy nhất (30%)</span>
                  <span>Chính xác nhất (95%)</span>
                </div>
              </div>

              {/* Slider 3: FPS Xử lý */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant font-bold">Tốc độ xử lý khung hình (FPS)</span>
                  <span className="font-mono text-brand-green font-extrabold bg-brand-green/10 px-2 py-0.5 rounded">{processingFps} FPS</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="30"
                  value={processingFps}
                  onChange={(e) => setProcessingFps(parseInt(e.target.value))}
                  className="w-full accent-brand-green h-1.5 bg-surface-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
                  <span>Tiết kiệm (1 FPS)</span>
                  <span>Thời gian thực (30 FPS)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: Notification & Storage logs */}
        <section className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 flex items-center justify-center text-brand-cyan-light">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Tần suất thông báo &amp; Lưu trữ</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Thiết lập thời gian gửi và chu kỳ tự động dọn dẹp</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Notification frequency drop */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1">Khoảng nghỉ tin nhắn khẩn cấp</label>
                <select 
                  value={notifyFrequency}
                  onChange={(e) => setNotifyFrequency(e.target.value)}
                  className="w-full bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3.5 py-3 outline-none font-semibold cursor-pointer"
                >
                  <option>Không giới hạn (Gửi liên tục)</option>
                  <option>Gửi cách nhau 1 phút</option>
                  <option>Gửi cách nhau 5 phút</option>
                  <option>Gửi cách nhau 10 phút</option>
                </select>
              </div>

              {/* Toggle switch 1: Save images */}
              <div className="flex items-center justify-between p-3.5 bg-surface-low/50 rounded-xl border border-white/5">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Chụp ảnh đính kèm sự cố</p>
                  <p className="text-[9px] text-on-surface-variant">Lưu ảnh snapshot camera vào SSD khi có cháy</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={saveImages} 
                    onChange={(e) => setSaveImages(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>

              {/* Toggle switch 2: Save videos */}
              <div className="flex items-center justify-between p-3.5 bg-surface-low/50 rounded-xl border border-white/5">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Lưu video đính kèm (5 giây)</p>
                  <p className="text-[9px] text-on-surface-variant">Cắt và lưu video 5s trước/sau thời điểm xảy ra vụ cháy</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={saveVideos} 
                    onChange={(e) => setSaveVideos(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>

              {/* Dropdown 2: Log retention */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1">Chu kỳ xóa dọn Log cũ</label>
                <select 
                  value={logRetention}
                  onChange={(e) => setLogRetention(e.target.value)}
                  className="w-full bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3.5 py-3 outline-none font-semibold cursor-pointer"
                >
                  <option>30 ngày</option>
                  <option>60 ngày</option>
                  <option>90 ngày</option>
                  <option>Không bao giờ</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 3: UI Preference Controls */}
        <section className="glass-panel p-6 rounded-2xl shadow-xl md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/15 flex items-center justify-center text-brand-orange">
              <Layout className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Cá nhân hóa Giao diện hệ thống</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Điều chỉnh ngôn ngữ, sidebar và cấu hình màu chủ đề</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Lang preference */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Ngôn ngữ hiển thị
              </label>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-surface-high border border-outline-variant/30 text-white rounded-xl text-xs px-3.5 py-3 outline-none font-semibold cursor-pointer"
              >
                <option>Tiếng Việt (VN)</option>
                <option>English (US)</option>
              </select>
            </div>

            {/* Sidebar Compact state option */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1 flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5" /> Sidebar gọn gàng
              </span>
              <div className="flex items-center justify-between p-3 bg-surface-low/50 rounded-xl border border-white/5 h-[46px]">
                <span className="text-xs font-semibold text-white">Thu nhỏ Sidebar</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={sidebarCompact} 
                    onChange={(e) => setSidebarCompact(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>
            </div>

            {/* Theme switcher */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-1 flex items-center gap-1">
                <Moon className="w-3.5 h-3.5" /> Giao diện hiển thị
              </span>
              <div className="flex bg-surface-lowest rounded-xl p-1 border border-white/5 h-[46px] items-center">
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex-1 h-full rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-brand-blue text-white' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tối (Dark)</span>
                </button>
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex-1 h-full rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-brand-blue text-white' : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng (Light)</span>
                </button>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Primary Save Changes action bar */}
      <div className="glass-panel p-4 rounded-2xl flex justify-between items-center shadow-lg">
        <p className="text-xs text-on-surface-variant font-medium">
          * Đảm bảo kiểm tra các tham số AI nhạy để tránh cảnh báo ảo (False Alarms) từ ánh đèn pha.
        </p>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-brand-blue hover:bg-brand-primary-container text-white text-xs font-extrabold px-6 py-3.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-blue/25 flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Đang lưu cài đặt...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5px]" />
              <span>Cập nhật thành công!</span>
            </>
          ) : (
            <>
              <Sliders className="w-4 h-4" />
              <span>Lưu thay đổi cài đặt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
