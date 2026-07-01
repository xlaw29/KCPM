/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, Save, Check, Eye, EyeOff, Rocket, ChevronRight } from 'lucide-react';
import { TelegramConfig } from '../types';

interface TelegramConfigViewProps {
  config: TelegramConfig;
  onSaveConfig: (cfg: TelegramConfig) => void;
  onSendTestMessage: () => void;
}

export default function TelegramConfigView({
  config,
  onSaveConfig,
  onSendTestMessage,
}: TelegramConfigViewProps) {
  const [botToken, setBotToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [autoSendEnabled, setAutoSendEnabled] = useState(config.autoSendEnabled);
  const [showToken, setShowToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleSave = () => {
    if (!botToken.trim() || !chatId.trim()) {
      alert('Vui lòng nhập Bot Token và Chat ID Telegram.');
      return;
    }
    onSaveConfig({ botToken: botToken.trim(), chatId: chatId.trim(), autoSendEnabled });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTest = () => {
    if (isTesting) return;
    setIsTesting(true);
    setTestSuccess(false);
    Promise.resolve(onSendTestMessage()).finally(() => {
      setIsTesting(false);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider">
        <span>Hệ thống</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brand-cyan-light">Cấu hình Telegram Bot</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <section className="glass-panel rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-cyan/15 rounded-xl flex items-center justify-center text-brand-cyan-light">
                <Send className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Kết nối Telegram Bot</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Nhận cảnh báo cháy (kèm ảnh) ngay trên điện thoại — miễn phí
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase pl-1">
                  Bot Token (từ @BotFather)
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdef..."
                    className="w-full bg-surface-high border border-outline-variant/30 rounded-xl px-4 py-3 pr-11 text-xs text-white focus:ring-2 focus:ring-brand-cyan outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-white cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-extrabold text-on-surface-variant tracking-wider uppercase pl-1">
                  Chat ID (ID Telegram của bạn hoặc nhóm)
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Ví dụ: 123456789"
                  className="w-full bg-surface-high border border-outline-variant/30 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-brand-cyan outline-none"
                />
                <p className="text-[9px] text-on-surface-variant/50 italic pl-1">
                  * Lấy Chat ID bằng cách nhắn cho bot, rồi mở:
                  https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-low/50 rounded-xl border border-white/5 shadow-md">
                <div className="flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-brand-cyan-light animate-pulse-subtle" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Bật gửi Telegram tự động</p>
                    <p className="text-[10px] text-on-surface-variant/80 mt-0.5">
                      Tự động bắn tin Telegram kèm ảnh khi phát hiện cháy/khói
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSendEnabled}
                    onChange={(e) => setAutoSendEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-cyan"></div>
                </label>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-brand-cyan text-surface-lowest font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-cyan/20"
              >
                {saveSuccess ? <><Check className="w-4 h-4 stroke-[2.5px]" /><span>Đã lưu Telegram!</span></> : <><Save className="w-4 h-4" /><span>Lưu cấu hình Telegram</span></>}
              </button>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex-1 bg-surface-high hover:bg-surface-highest text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-white/5 active:scale-95 disabled:opacity-50"
              >
                {isTesting ? <span>Đang gửi thử...</span> : testSuccess ? <><Check className="w-4 h-4" /><span>Đã gửi thử!</span></> : <><Send className="w-4 h-4" /><span>Gửi thử Telegram</span></>}
              </button>
            </div>
          </section>
        </div>

        {/* Huong dan nhanh */}
        <div className="lg:col-span-5">
          <section className="glass-panel rounded-2xl p-6 shadow-xl">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Cách lấy Token &amp; Chat ID (2 phút)</h4>
            <ol className="space-y-3 text-[11px] text-on-surface-variant leading-relaxed list-decimal pl-4">
              <li>Mở Telegram, tìm <b className="text-white">@BotFather</b> → gửi <code className="text-brand-cyan-light">/newbot</code> → đặt tên → nhận <b className="text-white">Bot Token</b>.</li>
              <li>Nhắn 1 tin bất kỳ cho bot vừa tạo (để bot thấy bạn).</li>
              <li>Mở trình duyệt: <code className="text-brand-cyan-light break-all">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
              <li>Tìm <code className="text-brand-cyan-light">"chat":{'{'}"id": ... {'}'}</code> → đó là <b className="text-white">Chat ID</b>.</li>
              <li>Dán cả hai vào đây, <b className="text-white">Lưu</b> → <b className="text-white">Gửi thử</b>.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
