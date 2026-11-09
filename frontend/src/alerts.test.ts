/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Kiem thu tu dong quy tac canh bao (F52-F59, F64-F70).
// Chay: npm test  (node --import tsx --test src/alerts.test.ts)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALERT_COOLDOWN_MS,
  buildAlertMessage,
  classifySeverity,
  evaluateAlert,
  isCooldownElapsed,
  isTelegramReady,
  validateTelegramConfig,
} from './alerts';

const THRESHOLDS = { fire: 0.4, smoke: 0.35 };
const VALID_TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';

// ---------------------------------------------------------------------------
// F52 - Khong co doi tuong nao -> khong canh bao
// ---------------------------------------------------------------------------
test('F52: danh sach rong thi khong kich hoat canh bao', () => {
  const result = evaluateAlert([], THRESHOLDS);
  assert.deepEqual(result, { alert: false, highest: 0, triggered: [] });
});

test('F52b: lop khong phai fire/smoke bi bo qua hoan toan', () => {
  const result = evaluateAlert([{ class_name: 'person', confidence: 0.99 }], THRESHOLDS);
  assert.equal(result.alert, false);
  assert.equal(result.highest, 0);
  assert.deepEqual(result.triggered, []);
});

// ---------------------------------------------------------------------------
// F53 - Duoi nguong -> khong canh bao
// ---------------------------------------------------------------------------
test('F53: fire 39% duoi nguong 40% thi khong canh bao', () => {
  const result = evaluateAlert([{ class_name: 'fire', confidence: 0.39 }], THRESHOLDS);
  assert.equal(result.alert, false);
  assert.equal(result.triggered.length, 0);
  // Van ghi nhan do tin cay cao nhat de hien thi HUD.
  assert.equal(result.highest, 0.39);
});

test('F53b: smoke 34% duoi nguong khoi 35% thi khong canh bao', () => {
  const result = evaluateAlert([{ class_name: 'smoke', confidence: 0.34 }], THRESHOLDS);
  assert.equal(result.alert, false);
});

// ---------------------------------------------------------------------------
// F54 - Bang dung nguong (bien) -> canh bao
// ---------------------------------------------------------------------------
test('F54: fire dung bang nguong 40% thi kich hoat canh bao', () => {
  const result = evaluateAlert([{ class_name: 'fire', confidence: 0.4 }], THRESHOLDS);
  assert.deepEqual(result, { alert: true, highest: 0.4, triggered: ['fire'] });
});

// ---------------------------------------------------------------------------
// F55 - Moi lop dung nguong rieng
// ---------------------------------------------------------------------------
test('F55: smoke 35% kich hoat theo nguong khoi (khong dung nguong lua)', () => {
  const result = evaluateAlert([{ class_name: 'smoke', confidence: 0.35 }], THRESHOLDS);
  assert.equal(result.alert, true);
  assert.deepEqual(result.triggered, ['smoke']);
});

test('F55b: nhieu box cung lop chi ghi nhan 1 lan trong triggered', () => {
  const result = evaluateAlert(
    [
      { class_name: 'fire', confidence: 0.55 },
      { class_name: 'fire', confidence: 0.72 },
    ],
    THRESHOLDS,
  );
  assert.equal(result.alert, true);
  assert.equal(result.highest, 0.72);
  assert.deepEqual(result.triggered, ['fire']);
});

test('F55c: ca lua va khoi cung vuot nguong thi ghi nhan ca hai', () => {
  const result = evaluateAlert(
    [
      { class_name: 'smoke', confidence: 0.5 },
      { class_name: 'fire', confidence: 0.8 },
    ],
    THRESHOLDS,
  );
  assert.deepEqual(result.triggered, ['smoke', 'fire']);
});

// ---------------------------------------------------------------------------
// F56, F57, F58 - Phan loai muc do nghiem trong
// ---------------------------------------------------------------------------
test('F56: fire >= 70% la critical', () => {
  assert.equal(classifySeverity(['fire'], 0.7), 'critical');
  assert.equal(classifySeverity(['fire'], 0.95), 'critical');
});

test('F57: fire < 70% la high', () => {
  assert.equal(classifySeverity(['fire'], 0.69), 'high');
});

test('F58: smoke >= 60% la high, duoi 60% la medium', () => {
  assert.equal(classifySeverity(['smoke'], 0.6), 'high');
  assert.equal(classifySeverity(['smoke'], 0.59), 'medium');
});

test('F58b: lop khong phai fire van theo nguong do tin cay', () => {
  assert.equal(classifySeverity(['suspect'], 0.99), 'high');
  assert.equal(classifySeverity(['suspect'], 0.2), 'medium');
});

// ---------------------------------------------------------------------------
// F59 - Cooldown giua 2 lan canh bao
// ---------------------------------------------------------------------------
test('F59: chua tung canh bao thi luon cho phep', () => {
  assert.equal(isCooldownElapsed(0, 1_000_000), true);
});

test('F59b: trong 8 giay thi chan canh bao', () => {
  assert.equal(isCooldownElapsed(1_000, 1_000 + 7_999), false);
});

test('F59c: dung 8 giay thi cho phep (bien)', () => {
  assert.equal(ALERT_COOLDOWN_MS, 8000);
  assert.equal(isCooldownElapsed(1_000, 1_000 + 8_000), true);
  assert.equal(isCooldownElapsed(1_000, 1_000 + 8_001), true);
});

test('F59d: ho tro cooldown tuy chinh', () => {
  assert.equal(isCooldownElapsed(1_000, 1_500, 400), true);
  assert.equal(isCooldownElapsed(1_000, 1_399, 400), false);
});

// ---------------------------------------------------------------------------
// F64-F69 - Kiem tra cau hinh Telegram
// ---------------------------------------------------------------------------
test('F64: cau hinh hop le thi khong co loi', () => {
  assert.deepEqual(validateTelegramConfig({ botToken: VALID_TOKEN, chatId: '123456789' }), {});
  // Nhom chat co ID am va kenh @username cung hop le.
  assert.deepEqual(validateTelegramConfig({ botToken: VALID_TOKEN, chatId: '-1001234567890' }), {});
  assert.deepEqual(validateTelegramConfig({ botToken: VALID_TOKEN, chatId: '@kenh_canh_bao' }), {});
});

test('F64b: khoang trang dau/cuoi duoc cat bo truoc khi kiem tra', () => {
  assert.deepEqual(
    validateTelegramConfig({ botToken: `  ${VALID_TOKEN}  `, chatId: ' 123456789 ' }),
    {},
  );
});

test('F65: thieu Bot Token bao loi', () => {
  const errors = validateTelegramConfig({ botToken: '   ', chatId: '123456789' });
  assert.equal(errors.botToken, 'Chưa nhập Bot Token.');
  assert.equal(errors.chatId, undefined);
});

test('F66: Bot Token sai dinh dang bao loi', () => {
  for (const token of ['abc', '123456789', '123456789:', '123456789:short', 'abc:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw']) {
    const errors = validateTelegramConfig({ botToken: token, chatId: '123456789' });
    assert.ok(errors.botToken, `token "${token}" phai bi tu choi`);
  }
});

test('F67: thieu Chat ID bao loi', () => {
  const errors = validateTelegramConfig({ botToken: VALID_TOKEN, chatId: '' });
  assert.equal(errors.chatId, 'Chưa nhập Chat ID.');
  assert.equal(errors.botToken, undefined);
});

test('F68: Chat ID sai dinh dang bao loi', () => {
  for (const chatId of ['abc123', '12 34', '12345678901234567890123x', '@a']) {
    const errors = validateTelegramConfig({ botToken: VALID_TOKEN, chatId });
    assert.ok(errors.chatId, `chat id "${chatId}" phai bi tu choi`);
  }
});

test('F69: isTelegramReady phu thuoc ca 3 dieu kien', () => {
  const base = { botToken: VALID_TOKEN, chatId: '123456789' };
  assert.equal(isTelegramReady({ ...base, autoSendEnabled: true }), true);
  assert.equal(isTelegramReady({ ...base, autoSendEnabled: false }), false);
  assert.equal(isTelegramReady({ botToken: '', chatId: '123456789', autoSendEnabled: true }), false);
  assert.equal(isTelegramReady({ botToken: VALID_TOKEN, chatId: 'sai', autoSendEnabled: true }), false);
});

// ---------------------------------------------------------------------------
// F70 - Noi dung tin nhan canh bao
// ---------------------------------------------------------------------------
test('F70: tin nhan canh bao lua dung dinh dang', () => {
  const message = buildAlertMessage({
    type: 'fire',
    cameraName: 'CAM-01 (Camera máy tính)',
    confidence: 0.834,
    time: '14:05:09',
    date: '10/11/2026',
  });
  assert.equal(
    message,
    '🔥 CẢNH BÁO LỬA/CHÁY tại CAM-01 (Camera máy tính). ' +
      'Độ tin cậy 83%. Thời gian 14:05:09 10/11/2026. Vui lòng kiểm tra ngay!',
  );
});

test('F70b: tin nhan canh bao khoi dung nhan khoi', () => {
  const message = buildAlertMessage({
    type: 'smoke',
    cameraName: 'CAM-02 (Điện thoại IP)',
    confidence: 0.5,
    time: '08:00:00',
    date: '01/01/2026',
  });
  assert.ok(message.includes('CẢNH BÁO KHÓI tại CAM-02 (Điện thoại IP)'));
  assert.ok(message.includes('Độ tin cậy 50%'));
});
