/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useDeferredValue, useEffect, useState } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  Video,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  ImageOff
} from 'lucide-react';
import {
  acknowledgeDetection,
  getDetection,
  listDetections,
  DetectionRecord
} from '../api';

interface HistoryViewProps {
  /** Ten nguoi dang dang nhap - ghi vao cot nguoi xac minh. */
  operatorName?: string;
}

const PAGE_SIZE = 20;

// Nhan + mau hien thi cho trang thai gui canh bao Telegram.
const TELEGRAM_BADGE: Record<DetectionRecord['telegram_status'], { text: string; className: string }> = {
  none: { text: 'Không gửi', className: 'bg-surface-high text-on-surface-variant border-white/5' },
  pending: { text: 'Đang gửi...', className: 'bg-brand-cyan/10 text-brand-cyan-light border-brand-cyan/20' },
  sent: { text: 'Đã gửi', className: 'bg-brand-green/10 text-brand-green border-brand-green/25' },
  failed: { text: 'Gửi lỗi', className: 'bg-red-500/10 text-red-400 border-red-500/25' },
};

const TYPE_BADGE: Record<string, { text: string; className: string }> = {
  fire: { text: 'Lửa', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  smoke: { text: 'Khói', className: 'bg-brand-cyan/10 text-brand-cyan-light border-brand-cyan/20' },
  suspect: { text: 'Vật thể lạ', className: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventCode(record: DetectionRecord): string {
  const prefix = record.type === 'fire' ? 'FIRE' : record.type === 'smoke' ? 'SMOK' : 'SUSP';
  return `${prefix}-${String(record.id).padStart(6, '0')}`;
}

export default function HistoryView({ operatorName = 'Quản trị viên' }: HistoryViewProps) {
  const [logs, setLogs] = useState<DetectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [filterType, setFilterType] = useState('all');
  const [filterAck, setFilterAck] = useState('all');
  const [page, setPage] = useState(1);

  // Chi tiet su kien dang mo trong modal.
  const [detail, setDetail] = useState<DetectionRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ackSaving, setAckSaving] = useState(false);

  const loadLogs = async (options: { silent?: boolean } = {}) => {
    if (options.silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await listDetections({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        type: filterType === 'all' ? undefined : filterType,
        q: deferredSearch.trim() || undefined,
        acknowledged: filterAck === 'all' ? undefined : filterAck === 'yes',
      });
      setLogs(result.detections);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử sự kiện.');
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Tai lai khi doi bo loc / trang / tu khoa tim kiem.
  useEffect(() => {
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterAck, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openDetail = async (id: number) => {
    const local = logs.find((l) => l.id === id) || null;
    setDetail(local);
    setDetailLoading(true);
    try {
      // Lay chi tiet moi nhat tu API.
      setDetail(await getDetection(id));
    } catch {
      // Neu API loi thi van hien du lieu dang co trong danh sach.
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcknowledge = async (record: DetectionRecord) => {
    setAckSaving(true);
    try {
      const updated = await acknowledgeDetection(record.id, operatorName);
      setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setDetail(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xác nhận được sự kiện.');
    } finally {
      setAckSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const header = [
      'Mã sự kiện',
      'Ngày ghi nhận',
      'Thời gian',
      'Nguồn camera',
      'Loại sự kiện',
      'Mức độ',
      'Độ tin cậy (%)',
      'Người xác minh',
      'Trạng thái Telegram',
    ];
    const rows = logs.map((log) => [
      eventCode(log),
      formatDate(log.created_at),
      formatTime(log.created_at),
      log.camera_name,
      TYPE_BADGE[log.type]?.text || log.type,
      log.severity,
      Math.round(log.confidence * 100),
      log.acknowledged_by || (log.acknowledged ? 'Hệ thống' : 'Chưa xử lý'),
      TELEGRAM_BADGE[log.telegram_status]?.text || log.telegram_status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    // BOM de Excel doc dung tieng Viet.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lich-su-su-kien-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const renderTelegramBadge = (record: DetectionRecord) => {
    const badge = TELEGRAM_BADGE[record.telegram_status] || TELEGRAM_BADGE.none;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Action Toolbar */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Search bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Tìm kiếm camera, người xử lý..."
              className="bg-surface-high text-xs rounded-xl pl-10 pr-4 py-2.5 w-full text-white outline-none focus:ring-2 focus:ring-brand-blue border border-white/5"
            />
          </div>

          {/* Type filter */}
          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="bg-surface-high border border-white/5 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer"
          >
            <option value="all">Tất cả sự cố</option>
            <option value="fire">Chỉ Phát hiện Lửa</option>
            <option value="smoke">Chỉ Phát hiện Khói</option>
            <option value="suspect">Chỉ Vật thể lạ</option>
          </select>

          {/* Acknowledge filter */}
          <select 
            value={filterAck}
            onChange={(e) => { setFilterAck(e.target.value); setPage(1); }}
            className="bg-surface-high border border-white/5 text-white rounded-xl text-xs px-3 py-2.5 outline-none font-medium cursor-pointer"
          >
            <option value="all">Mọi trạng thái xử lý</option>
            <option value="no">Chưa xử lý</option>
            <option value="yes">Đã xác minh</option>
          </select>

          <button
            onClick={() => void loadLogs({ silent: true })}
            disabled={isRefreshing}
            className="bg-surface-high hover:bg-white/10 text-on-surface-variant hover:text-white border border-white/5 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button 
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="bg-brand-green/10 hover:bg-brand-green/20 text-brand-green border border-brand-green/25 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (CSV)</span>
          </button>
          <button 
            onClick={handleExportPdf}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Tải Báo cáo PDF</span>
          </button>
        </div>
      </div>

      {/* Structured Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Nhật ký sự kiện lưu trữ</h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Bản ghi hệ thống phục vụ công tác thanh tra PCCC (lưu trong CSDL)</p>
          </div>
          <span className="text-xs text-on-surface-variant font-medium">Tổng số bản ghi: <span className="font-bold text-white">{total}</span></span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-brand-cyan-light" />
            <p className="text-xs font-medium">Đang tải nhật ký sự kiện…</p>
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-white">Không tải được nhật ký</h4>
              <p className="text-xs text-on-surface-variant">{error}</p>
            </div>
            <button
              onClick={() => void loadLogs()}
              className="mt-1 px-4 py-2.5 bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan-light border border-brand-cyan/30 rounded-xl text-xs font-bold cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Download className="w-10 h-10 text-on-surface-variant/30" />
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-white">Chưa có bản ghi nào</h4>
              <p className="text-xs text-on-surface-variant">Các sự kiện phát hiện cháy/khói sẽ được lưu tự động vào đây.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead className="bg-surface-high/50 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Mã sự kiện</th>
                  <th className="px-6 py-4">Ngày ghi nhận</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Nguồn camera</th>
                  <th className="px-6 py-4">Sự kiện</th>
                  <th className="px-6 py-4">Tin cậy</th>
                  <th className="px-6 py-4">Người xác minh</th>
                  <th className="px-6 py-4">Telegram</th>
                  <th className="px-6 py-4 text-right">Chi tiết log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-brand-blue">{eventCode(log)}</td>
                    <td className="px-6 py-4 font-mono">{formatDate(log.created_at)}</td>
                    <td className="px-6 py-4 font-mono font-medium text-white">{formatTime(log.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{log.camera_name || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${TYPE_BADGE[log.type]?.className || TYPE_BADGE.suspect.className}`}>
                          {TYPE_BADGE[log.type]?.text || log.type}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border bg-surface-highest text-on-surface-variant border-white/5">
                          {log.severity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">{Math.round(log.confidence * 100)}%</td>
                    <td className="px-6 py-4">
                      {log.acknowledged ? (
                        <span className="text-brand-green font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {log.acknowledged_by || 'Hệ thống'}
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Chưa xử lý
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{renderTelegramBadge(log)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => void openDetail(log.id)}
                        className="text-brand-cyan-light hover:underline font-bold cursor-pointer"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant/10 flex items-center justify-between">
            <p className="text-xs text-on-surface-variant font-medium">
              Trang <span className="font-bold text-white">{page}</span> / <span className="font-bold text-white">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/5 bg-surface-high text-on-surface-variant/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/5 bg-surface-high text-on-surface-variant/80 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiet su kien */}
      {detail && (
        <div className="fixed inset-0 bg-surface-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setDetail(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 flex items-center justify-center text-brand-cyan-light">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{eventCode(detail)}</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {formatTime(detail.created_at)} ngày {formatDate(detail.created_at)}
                </p>
              </div>
              <div className="ml-auto mr-8">{renderTelegramBadge(detail)}</div>
            </div>

            <div className="rounded-xl overflow-hidden bg-surface-lowest border border-white/5 mb-5 aspect-video flex items-center justify-center">
              {detail.image_path ? (
                <img
                  src={detail.image_path}
                  alt={`Ảnh sự kiện ${eventCode(detail)}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-on-surface-variant/40">
                  <ImageOff className="w-9 h-9" />
                  <span className="text-[10px] uppercase font-bold">Không có ảnh đính kèm</span>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Camera</dt>
                <dd className="text-white font-semibold mt-1">{detail.camera_name || '—'}</dd>
              </div>
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Loại / Mức độ</dt>
                <dd className="text-white font-semibold mt-1 uppercase">
                  {TYPE_BADGE[detail.type]?.text || detail.type} · {detail.severity}
                </dd>
              </div>
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Độ tin cậy</dt>
                <dd className="text-white font-semibold mt-1">{Math.round(detail.confidence * 100)}%</dd>
              </div>
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Lớp phát hiện</dt>
                <dd className="text-white font-semibold mt-1">
                  {detail.detected_classes.length ? detail.detected_classes.join(', ') : '—'}
                </dd>
              </div>
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Nguồn</dt>
                <dd className="text-white font-semibold mt-1">{detail.source}</dd>
              </div>
              <div className="bg-surface-high/60 border border-white/5 rounded-xl p-3">
                <dt className="text-[10px] uppercase font-bold text-on-surface-variant/70">Xác minh xử lý</dt>
                <dd className={`font-semibold mt-1 ${detail.acknowledged ? 'text-brand-green' : 'text-red-400'}`}>
                  {detail.acknowledged ? `Đã xác minh bởi ${detail.acknowledged_by || 'Hệ thống'}` : 'Chưa xử lý'}
                </dd>
              </div>
            </dl>

            {/* Nhat ky gui Telegram */}
            <div className="mt-4 bg-surface-low/60 border border-white/5 rounded-xl p-4">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant/70 flex items-center gap-1.5 mb-2">
                <Send className="w-3.5 h-3.5 text-brand-cyan-light" /> Nhật ký gửi Telegram
              </p>
              {detailLoading ? (
                <p className="text-xs text-on-surface-variant">Đang tải chi tiết…</p>
              ) : (
                <div className="space-y-1 text-xs">
                  <p className="text-on-surface">
                    Trạng thái:{' '}
                    <span className="font-bold text-white">
                      {TELEGRAM_BADGE[detail.telegram_status]?.text || detail.telegram_status}
                    </span>
                  </p>
                  {detail.telegram_chat_id && (
                    <p className="text-on-surface-variant">Chat ID: <span className="font-mono text-white">{detail.telegram_chat_id}</span></p>
                  )}
                  {detail.telegram_sent_at && (
                    <p className="text-on-surface-variant">
                      Gửi lúc: <span className="font-mono text-white">{formatTime(detail.telegram_sent_at)} {formatDate(detail.telegram_sent_at)}</span>
                    </p>
                  )}
                  {detail.telegram_error && (
                    <p className="text-red-400 break-words">Lỗi: {detail.telegram_error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              {!detail.acknowledged && (
                <button
                  onClick={() => void handleAcknowledge(detail)}
                  disabled={ackSaving}
                  className="flex-1 py-3 bg-brand-cyan hover:bg-brand-cyan-light text-surface-lowest font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-cyan/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {ackSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Xác nhận xử lý sự kiện
                </button>
              )}
              <button
                onClick={() => setDetail(null)}
                className="px-5 py-3 bg-surface-high hover:bg-white/10 text-white border border-white/5 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
