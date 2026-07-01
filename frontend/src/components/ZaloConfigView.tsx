/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Link, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Rocket, 
  Save, 
  Send, 
  Smartphone, 
  PhoneCall, 
  Menu, 
  Check, 
  AlertCircle,
  Wifi,
  ChevronRight
} from 'lucide-react';
import { ZaloConfig } from '../types';

interface ZaloConfigViewProps {
  config: ZaloConfig;
  onSaveConfig: (updatedConfig: ZaloConfig) => void;
  onSendTestMessage: () => void;
}

export default function ZaloConfigView({
  config,
  onSaveConfig,
  onSendTestMessage
}: ZaloConfigViewProps) {
  const [oaId, setOaId] = useState(config.oaId);
  const [accessToken, setAccessToken] = useState(config.accessToken);
  const [recipients, setRecipients] = useState<string[]>(config.recipients);
  const [autoSendEnabled, setAutoSendEnabled] = useState(config.autoSendEnabled);

  // Form helper states
  const [newPhone, setNewPhone] = useState('');
  const [showToken, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Add Phone Chip handler
  const handleAddPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newPhone.trim();
    if (!id) return;

    // Zalo OA gui theo user_id (khong phai SDT) -> chap nhan chuoi bat ky.
    if (recipients.includes(id)) {
      alert('user_id này đã có trong danh sách nhận tin.');
      return;
    }

    setRecipients([...recipients, id]);
    setNewPhone('');
  };

  // Remove Phone Chip handler
  const handleRemovePhone = (phone: string) => {
    setRecipients(recipients.filter(r => r !== phone));
  };

  // Submit Handler
  const handleSave = () => {
    if (!oaId.trim() || !accessToken.trim()) {
      alert('Vui lòng điền đầy đủ Zalo OA ID và Access Token.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      onSaveConfig({
        oaId,
        accessToken,
        recipients,
        autoSendEnabled
      });
      setIsSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1200);
  };

  // Test send handler
  const handleTestSend = () => {
    if (isTesting) return;
    setIsTestSending(true);
    setTestSuccess(false);

    setTimeout(() => {
      onSendTestMessage();
      setIsTestSending(false);
      setTestSuccess(true);

      setTimeout(() => {
        setTestSuccess(false);
      }, 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">
        <span>Hệ thống</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brand-cyan-light">Cấu hình Zalo Integration</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Connection form config */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <section className="glass-panel rounded-2xl p-8 shadow-xl relative overflow-hidden">
            
            {/* Ambient visual indicator */}
            <div className="absolute top-0 right-0 p-8 opacity-5 text-on-surface-variant pointer-events-none select-none">
              <MessageSquare className="w-64 h-64 stroke-[1px]" />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-blue/15 rounded-xl flex items-center justify-center text-brand-blue">
                <Link className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Kết nối Zalo Official Account</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Thiết lập kết nối bảo mật API với Zalo OA của doanh nghiệp</p>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Zalo OA ID Input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase pl-1">
                  Zalo OA ID
                </label>
                <input 
                  type="text"
                  value={oaId}
                  onChange={(e) => setOaId(e.target.value)}
                  placeholder="Nhập OA ID định danh"
                  className="w-full bg-surface-high border border-outline-variant/30 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>

              {/* Masked Access Token */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase pl-1">
                  Zalo Developer Access Token
                </label>
                <div className="relative">
                  <input 
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Nhập API Secret Token"
                    className="w-full bg-surface-high border border-outline-variant/30 rounded-xl px-4 py-3 pr-11 text-xs text-white focus:ring-2 focus:ring-brand-blue outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-white cursor-pointer transition-colors"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Dynamic list phone input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase pl-1">
                  Danh sách user_id người nhận
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-surface-low/80 border border-outline-variant/30 rounded-xl min-h-[100px] items-start">
                  
                  {/* Phone chips */}
                  {recipients.map((phone) => (
                    <div 
                      key={phone} 
                      className="bg-brand-blue/15 text-brand-blue border border-brand-blue/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold"
                    >
                      <span>{phone}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemovePhone(phone)}
                        className="text-brand-blue hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Input inline inside container */}
                  <form onSubmit={handleAddPhone} className="flex-1 min-w-[130px]">
                    <input 
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Thêm user_id và ấn Enter..."
                      className="bg-transparent border-none text-xs text-white placeholder:text-on-surface-variant/30 focus:ring-0 p-0.5 outline-none w-full"
                    />
                  </form>
                </div>
                <p className="text-[9px] text-on-surface-variant/50 italic pl-1">
                  * Zalo OA gửi theo user_id (người đã quan tâm &amp; nhắn cho OA), không phải SĐT.
                </p>
              </div>

              {/* Auto send toggle indicator */}
              <div className="flex items-center justify-between p-4 bg-surface-low/50 rounded-xl border border-white/5 shadow-md">
                <div className="flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-brand-cyan-light animate-pulse-subtle" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Bật gửi tin nhắn tự động</p>
                    <p className="text-[10px] text-on-surface-variant/80 mt-0.5">Hệ thống AI tự động bắn tin nhắn Zalo ngay khi phát hiện sự cố cháy</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={autoSendEnabled} 
                    onChange={(e) => setAutoSendEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-brand-blue text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-blue/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Đang lưu thông tin...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5px]" />
                    <span>Lưu cấu hình thành công!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu cấu hình OA</span>
                  </>
                )}
              </button>

              <button
                onClick={handleTestSend}
                disabled={isTesting}
                className="flex-1 bg-surface-high hover:bg-surface-highest text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/5 active:scale-95 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang gửi thử...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Gửi thử tin nhắn</span>
                </>
              )}
            </button>
          </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Interactive Smartphone Preview Frame */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider pl-1">Xem trước thông báo trên Zalo</h3>

          {/* Device Mock Frame */}
          <div className="relative mx-auto w-full max-w-[310px] aspect-[9/19] bg-black rounded-[2.5rem] border-[8px] border-surface-highest shadow-2xl overflow-hidden ring-4 ring-white/5">
            {/* Camera notch cutout */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-xl z-20"></div>

            {/* Simulated Phone OS Canvas */}
            <div className="h-full w-full bg-[#f4f5f7] flex flex-col text-left select-none">
              
              {/* Custom blue Zalo messenger title header */}
              <div className="bg-[#0068ff] pt-7 pb-2.5 px-3 flex items-center gap-2.5 text-white">
                <Smartphone className="w-4 h-4" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold leading-tight">Smart Fire Monitor</p>
                  <p className="text-[8px] opacity-75 leading-none">OA hỗ trợ bảo mật tự động</p>
                </div>
                <PhoneCall className="w-3.5 h-3.5" />
                <Menu className="w-3.5 h-3.5" />
              </div>

              {/* Chat Message Window Area */}
              <div className="flex-1 p-3.5 flex flex-col justify-end gap-3.5 overflow-hidden" style={{ backgroundImage: 'radial-gradient(#d1d1d1 1px, transparent 1px)', backgroundSize: '15px 15px' }}>
                
                {/* Date separator pill */}
                <div className="flex justify-center">
                  <span className="bg-gray-200 text-[8px] font-bold text-gray-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Hôm nay</span>
                </div>

                {/* Received Bubble */}
                <div className="flex items-end gap-1.5 max-w-[90%]">
                  {/* OA Avatar thumbnail representation */}
                  <div className="w-7 h-7 rounded-full bg-[#0068ff] flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow shadow-blue-500/20">SF</div>
                  
                  {/* Bubble body */}
                  <div className="bg-[#0068ff] p-3 rounded-2xl rounded-bl-sm shadow shadow-blue-500/10">
                    <p className="text-white text-[10px] font-bold tracking-wide uppercase">[CẢNH BÁO CHÁY CHỦ ĐỘNG]</p>
                    <p className="text-white text-[10px] leading-relaxed mt-1">
                      Hệ thống phát hiện <span className="bg-red-500 px-1 rounded font-bold">Lửa (Fire)</span> tại <span className="font-bold underline">Camera 01 (Kho vật tư)</span> với độ tin cậy <span className="font-extrabold text-yellow-200">94.2%</span>.
                    </p>
                    
                    {/* Simulated snapshot attachment in chat */}
                    <div className="mt-2.5 h-20 rounded-lg overflow-hidden border border-white/10 relative">
                      <img 
                        src="https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&q=80&w=300"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        alt="Test Snapshot Attachment"
                      />
                      <div className="absolute inset-0 bg-red-500/10 border-2 border-red-500 m-2 rounded animate-pulse"></div>
                    </div>

                    <p className="text-right text-[8px] text-white/70 mt-1.5">10:30</p>
                  </div>
                </div>

              </div>

              {/* Bottom typing bar */}
              <div className="bg-white p-2.5 border-t border-gray-100 flex items-center gap-2.5">
                <span className="text-gray-400 font-extrabold text-xs font-mono px-1 rounded border border-gray-200 bg-gray-50">+</span>
                <div className="flex-1 bg-gray-100 rounded-full px-3 py-1 text-[10px] text-gray-400">Nhập câu trả lời...</div>
                <span className="text-[#0068ff] font-bold text-[10px] uppercase">Gửi</span>
              </div>
            </div>
          </div>

          {/* Connection metrics Card */}
          <div className="glass-panel p-4 rounded-xl border-l-4 border-brand-cyan-light flex justify-between items-center shadow-lg">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white leading-none">Cổng API Zalo Gateway</h4>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Thời gian trễ kết nối (Ping): <span className="font-mono text-white">42ms</span></p>
            </div>
            <div className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-brand-green/20">
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              Ổn định
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
