/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppTab {
  DASHBOARD = 'dashboard',
  CAMERA_MONITOR = 'camera_monitor',
  ALERTS = 'alerts',
  HISTORY = 'history',
  ZALO_CONFIG = 'zalo_config',
  SETTINGS = 'settings',
}

export interface Camera {
  id: string;
  name: string;
  area: string;
  status: 'online' | 'offline' | 'viewing';
  rtspUrl: string;
  bandwidth: string;
  imageUrl: string;
  isThermal?: boolean;
}

export interface AlertEvent {
  id: string;
  timestamp: string; // "HH:mm:ss"
  date: string; // "DD/MM/YYYY"
  cameraName: string;
  type: 'fire' | 'smoke' | 'suspect';
  severity: 'critical' | 'high' | 'medium' | 'low';
  zaloStatus: string;
  zaloSuccess: 'success' | 'error' | 'none';
  acknowledged: boolean;
  acknowledgedBy?: string;
  imageUrl: string;
}

export interface ZaloConfig {
  oaId: string;
  accessToken: string;
  recipients: string[]; // user_id nguoi nhan (khong phai SDT)
  autoSendEnabled: boolean;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  autoSendEnabled: boolean;
}

export interface SystemSettings {
  fireConfidence: number;
  smokeConfidence: number;
  processingFps: number;
  notifyFrequency: string;
  saveImages: boolean;
  saveVideos: boolean;
  logRetention: string;
  theme: 'dark' | 'light';
  sidebarCompact: boolean;
  language: string;
}
