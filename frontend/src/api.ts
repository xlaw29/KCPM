/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Cau noi toi backend Flask (AI YOLOv8). Cac request /api duoc Vite proxy
// chuyen sang http://127.0.0.1:5000 (xem vite.config.ts).

export interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  class_id: number;
  class_name: string; // 'fire' | 'smoke'
  label: string; // 'Chay' | 'Khoi'
  confidence: number; // 0..1
  box: DetectionBox;
  width: number;
  height: number;
  area_ratio?: number;
}

export interface DetectSummary {
  alert: boolean;
  highest_confidence: number;
  detected_classes: string[];
  count: number;
}

export interface DetectFrameResult {
  image: string; // data:image/jpeg;base64,... (anh da ve box)
  detections: Detection[];
  summary: DetectSummary;
  result_type: 'image';
}

// URL video mau (Flask phuc vu tu thu muc cha cua du an).
export const SAMPLE_VIDEO_URL = '/api/media/sample';

export async function checkHealth(): Promise<{
  ok: boolean;
  model_exists: boolean;
  model_path: string;
  confidence_threshold: number;
}> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Khong ket noi duoc backend AI.');
  return res.json();
}

/** Gui mot khung hinh (dataURL JPEG) toi YOLOv8 de nhan dien. */
export async function detectFrame(
  imageDataUrl: string,
  conf?: number,
): Promise<DetectFrameResult> {
  const res = await fetch('/api/detect-frame', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({image: imageDataUrl, conf}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Loi nhan dien khung hinh.');
  return data as DetectFrameResult;
}

/** Nhan dien tu camera IP (dien thoai) - backend doc luong va tra ket qua. */
export async function detectIp(
  url: string,
  conf?: number,
): Promise<DetectFrameResult> {
  const res = await fetch('/api/detect-ip', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url, conf}),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Loi nhan dien camera IP.');
  return data as DetectFrameResult;
}

export interface ZaloSendResult {
  sent: number;
  total: number;
  results: {recipient: string; ok: boolean; response?: unknown; error?: string}[];
}

/** Gui tin nhan Zalo OA that su qua backend. */
export async function sendZalo(params: {
  accessToken: string;
  recipients: string[];
  message: string;
}): Promise<ZaloSendResult> {
  const res = await fetch('/api/zalo/send', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      access_token: params.accessToken,
      recipients: params.recipients,
      message: params.message,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Loi gui Zalo.');
  return data as ZaloSendResult;
}

export interface TelegramSendResult {
  ok: boolean;
  response?: unknown;
  error?: string;
}

/** Gui tin nhan Telegram (kem anh snapshot neu co) qua backend. */
export async function sendTelegram(params: {
  botToken: string;
  chatId: string;
  message: string;
  image?: string; // data URL anh da ve box
}): Promise<TelegramSendResult> {
  const res = await fetch('/api/telegram/send', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      bot_token: params.botToken,
      chat_id: params.chatId,
      message: params.message,
      image: params.image,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Loi gui Telegram.');
  return data as TelegramSendResult;
}
