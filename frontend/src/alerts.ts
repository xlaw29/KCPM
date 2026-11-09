/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Quy tac nghiep vu cua chuc nang canh bao (F52-F73) tach rieng khoi React
// de co the kiem thu tu dong bang `node --test`.

import { AlertEvent, TelegramConfig } from './types';

/** Thoi gian cho toi thieu giua 2 lan phat canh bao (ms). */
export const ALERT_COOLDOWN_MS = 8000;

export interface DetectedObject {
  class_name: string;
  confidence: number;
}

export interface AlertThresholds {
  /** Nguong do tin cay cho lop fire (0..1). */
  fire: number;
  /** Nguong do tin cay cho lop smoke (0..1). */
  smoke: number;
}

export interface AlertEvaluation {
  /** Co vuot nguong cua it nhat mot lop hay khong. */
  alert: boolean;
  /** Do tin cay cao nhat trong cac lop fire/smoke. */
  highest: number;
  /** Cac lop da vuot nguong (khong trung lap). */
  triggered: string[];
}

/**
 * Danh gia ket qua nhan dien: chi kich hoat canh bao khi do tin cay cua
 * fire/smoke dat nguong tuong ung. Cac lop khac bi bo qua.
 */
export function evaluateAlert(
  detections: DetectedObject[],
  thresholds: AlertThresholds,
): AlertEvaluation {
  let alert = false;
  let highest = 0;
  const triggered: string[] = [];

  for (const detection of detections) {
    const name = detection.class_name.toLowerCase();
    const threshold =
      name === 'fire' ? thresholds.fire : name === 'smoke' ? thresholds.smoke : 1;
    if (name !== 'fire' && name !== 'smoke') continue;

    highest = Math.max(highest, detection.confidence);
    if (detection.confidence >= threshold && !triggered.includes(name)) {
      alert = true;
      triggered.push(name);
    }
  }

  return { alert, highest, triggered };
}

export type AlertSeverity = AlertEvent['severity'];

/**
 * Phan loai muc do nghiem trong theo lop phat hien va do tin cay.
 * Quy tac nay trung voi backend (`_severity_for` trong app.py) de nhat ky
 * su kien va canh bao hien thi cung mot muc do.
 */
export function classifySeverity(classes: string[], confidence: number): AlertSeverity {
  const hasFire = classes.some((c) => c.toLowerCase() === 'fire');
  if (hasFire && confidence >= 0.7) return 'critical';
  if (hasFire) return 'high';
  if (confidence >= 0.6) return 'high';
  return 'medium';
}

/**
 * Kiem tra da het thoi gian cho (cooldown) hay chua.
 * `lastAlertAt = 0` nghia la chua tung canh bao.
 */
export function isCooldownElapsed(
  lastAlertAt: number,
  now: number,
  cooldownMs: number = ALERT_COOLDOWN_MS,
): boolean {
  if (!lastAlertAt) return true;
  return now - lastAlertAt >= cooldownMs;
}

export interface AlertMessageParams {
  type: AlertEvent['type'];
  cameraName: string;
  /** Do tin cay cao nhat (0..1). */
  confidence: number;
  /** Gio dang chuoi, vd "14:05:09". */
  time: string;
  /** Ngay dang chuoi, vd "10/11/2026". */
  date: string;
}

/** Soan noi dung tin nhan canh bao gui Telegram. */
export function buildAlertMessage({
  type,
  cameraName,
  confidence,
  time,
  date,
}: AlertMessageParams): string {
  const label = type === 'fire' ? 'LỬA/CHÁY' : type === 'smoke' ? 'KHÓI' : 'VẬT THỂ LẠ';
  return (
    `🔥 CẢNH BÁO ${label} tại ${cameraName}. ` +
    `Độ tin cậy ${Math.round(confidence * 100)}%. ` +
    `Thời gian ${time} ${date}. Vui lòng kiểm tra ngay!`
  );
}

export interface TelegramConfigErrors {
  botToken?: string;
  chatId?: string;
}

// Token that cua Telegram co dang "<bot_id>:<35 ky tu>" (bot_id la so).
const BOT_TOKEN_PATTERN = /^\d{6,}:[A-Za-z0-9_-]{20,}$/;
// Chat ID: so (nhom la so am) hoac @ten_kenh.
const CHAT_ID_PATTERN = /^(-?\d+|@[A-Za-z][A-Za-z0-9_]{3,})$/;

/** Kiem tra cau hinh Telegram; tra ve loi theo tung truong (rong = hop le). */
export function validateTelegramConfig(
  config: Pick<TelegramConfig, 'botToken' | 'chatId'>,
): TelegramConfigErrors {
  const errors: TelegramConfigErrors = {};
  const botToken = (config.botToken || '').trim();
  const chatId = (config.chatId || '').trim();

  if (!botToken) {
    errors.botToken = 'Chưa nhập Bot Token.';
  } else if (!BOT_TOKEN_PATTERN.test(botToken)) {
    errors.botToken = 'Bot Token không đúng định dạng (dạng 123456789:AA...).';
  }

  if (!chatId) {
    errors.chatId = 'Chưa nhập Chat ID.';
  } else if (!CHAT_ID_PATTERN.test(chatId)) {
    errors.chatId = 'Chat ID phải là số (nhóm có thể âm) hoặc @tên_kênh.';
  }

  return errors;
}

/** Cau hinh san sang gui Telegram tu dong hay khong. */
export function isTelegramReady(config: TelegramConfig): boolean {
  if (!config.autoSendEnabled) return false;
  const errors = validateTelegramConfig(config);
  return !errors.botToken && !errors.chatId;
}
