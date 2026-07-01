/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Video, Flame, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('nhanvien@congty.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    // Simulate high-tech server validation
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-surface-base text-on-surface font-sans overflow-hidden">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center opacity-30 grayscale-[0.3]"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=1200')` 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/85 to-transparent"></div>
        <div className="absolute inset-0 bg-aurora"></div>
      </div>

      {/* Main Content Card Container */}
      <main className="relative z-10 w-full max-w-[460px] px-6">
        <div className="glass-panel rounded-[2rem] p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
          {/* Subtle top indicator glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan-light via-brand-blue to-brand-cyan-light opacity-50"></div>

          {/* Logo Section */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20">
              <Video className="w-8 h-8 text-brand-blue" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Flame className="w-8 h-8 text-red-400 fill-current" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Giám sát &amp; Báo cháy</h2>
            <p className="text-xs text-on-surface-variant font-bold tracking-widest uppercase">Hệ thống Quản trị thông minh</p>
          </div>

          {/* Form */}
          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="flex items-center gap-2 text-xs bg-red-500/15 text-red-200 border border-red-500/25 p-3 rounded-xl animate-pulse-subtle">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase pl-1">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative flex items-center transition-all duration-200 glass-panel bg-white/5 rounded-xl border-outline-variant/30 focus-within:ring-2 focus-within:ring-brand-cyan-light/50 focus-within:border-transparent">
                <User className="w-4 h-4 absolute left-4 text-on-surface-variant/70" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-outline/40 focus:ring-0 outline-none"
                  placeholder="nhanvien@congty.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1 pr-1">
                <label className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
                  Mật khẩu
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Vui lòng liên hệ quản trị viên IT qua số nội bộ 114 để được cấp lại mật khẩu!"); }} className="text-[11px] font-bold text-brand-cyan-light hover:underline">
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative flex items-center transition-all duration-200 glass-panel bg-white/5 rounded-xl border-outline-variant/30 focus-within:ring-2 focus-within:ring-brand-cyan-light/50 focus-within:border-transparent">
                <Lock className="w-4 h-4 absolute left-4 text-on-surface-variant/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-outline/40 focus:ring-0 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-on-surface-variant/60 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5 px-1 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant/50 bg-surface-high text-brand-cyan focus:ring-brand-cyan/40"
              />
              <label htmlFor="remember" className="text-xs text-on-surface-variant/80 cursor-pointer font-medium select-none">
                Ghi nhớ phiên đăng nhập
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-brand-cyan hover:bg-brand-cyan-light text-surface-lowest font-bold text-sm tracking-wide rounded-xl transition-all duration-300 transform active:scale-[0.98] glow-cyan flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-surface-lowest" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Đang tải thông tin...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Integration */}
          <div className="mt-8 pt-6 border-t border-outline-variant/10 w-full text-center">
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Được bảo mật và tích hợp với</p>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 shadow-sm shadow-blue-500/5">
                <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-white font-black text-[9px]">Z</div>
                <span className="text-xs font-bold text-blue-400">Zalo Security Alert</span>
              </div>
            </div>
          </div>
        </div>

        {/* Micro status indicators bottom left of window layout (fixed) */}
        <div className="fixed bottom-6 left-6 hidden sm:flex gap-4 z-50">
          <div className="flex items-center gap-2 bg-surface-lowest/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
            <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Server: Online</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-lowest/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-brand-cyan-light animate-pulse-subtle"></span>
            <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">Sensors: Active</span>
          </div>
        </div>

        {/* Copyright bottom right */}
        <div className="fixed bottom-6 right-6 hidden sm:block z-50">
          <p className="text-[10px] text-on-surface-variant/40 font-bold">© 2024 Smart Fire Monitoring Solutions</p>
        </div>
      </main>
    </div>
  );
}
