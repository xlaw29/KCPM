/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Camera as CameraIcon,
  History,
  Send,
  CheckCircle,
  PlusCircle,
  Activity,
  RefreshCw,
  X,
  AlertOctagon,
  Webcam,
  Upload,
  Flame,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Camera, AlertEvent, AppTab, SystemSettings, TelegramConfig } from '../types';
import {
  detectFrame,
  detectIp,
  sendTelegram,
  Detection,
  checkHealth,
} from '../api';

type SourceMode = 'webcam' | 'ip' | 'upload';
type CamKind = 'device' | 'ip';

interface CameraMonitorViewProps {
  cameras: Camera[];
  selectedCameraId: string;
  setSelectedCameraId: (id: string) => void;
  onAddCamera: (newCam: Omit<Camera, 'status'>) => void;
  onAddAlert: (newAlert: AlertEvent) => void;
  setActiveTab: (tab: AppTab) => void;
  systemSettings: SystemSettings;
  telegramConfig: TelegramConfig;
  onNotify: (message: string, type?: 'success' | 'warn' | 'info') => void;
}

const ALERT_COOLDOWN_MS = 8000;
const DETECT_INTERVAL_MS = 800;

export default function CameraMonitorView({
  cameras,
  selectedCameraId,
  setSelectedCameraId,
  onAddCamera,
  onAddAlert,
  setActiveTab,
  systemSettings,
  telegramConfig,
  onNotify,
}: CameraMonitorViewProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('webcam');
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Trang thai nhan dien thuc te
  const [detections, setDetections] = useState<Detection[]>([]);
  const [highestConf, setHighestConf] = useState(0);
  const [isAlert, setIsAlert] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [uploadIsImage, setUploadIsImage] = useState(false);
  // Anh da duoc backend ve bounding box (toa do chinh xac tuyet doi).
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  // Danh sach camera + camera dang chon
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  // CAM-02: camera dien thoai qua IP (luu co dinh trong localStorage)
  const [ipUrl, setIpUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('ipCameraUrl') || '';
    } catch {
      return '';
    }
  });
  const [showIpModal, setShowIpModal] = useState(false);
  const [ipUrlInput, setIpUrlInput] = useState('');
  // Kich thuoc khung goc (pixel) cua frame vua nhan dien -> de scale box overlay.
  const [frameSize, setFrameSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Kich thuoc vung hien thi (container) -> de tinh letterbox object-contain.
  const [viewSize, setViewSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const lastAlertRef = useRef(0);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  const fireThreshold = systemSettings.fireConfidence / 100;
  const smokeThreshold = systemSettings.smokeConfidence / 100;

  // CAM-01 = camera may tinh, CAM-02 = camera dien thoai (IP)
  const macLabel = videoDevices[0]?.label || 'Camera máy tính';
  const cameraList: { camId: string; kind: CamKind; label: string }[] = [
    { camId: 'CAM-01', kind: 'device', label: macLabel },
    { camId: 'CAM-02', kind: 'ip', label: ipUrl ? 'Điện thoại (IP)' : 'Điện thoại (chưa cấu hình)' },
  ];
  const activeCamId = sourceMode === 'ip' ? 'CAM-02' : 'CAM-01';
  const activeCamLabel = sourceMode === 'ip' ? 'Điện thoại (IP)' : macLabel;

  // Kiem tra backend AI khi mo man hinh
  useEffect(() => {
    checkHealth()
      .then((h) => {
        if (!h.model_exists) setBackendError('Khong tim thay file model best.pt o backend.');
        else setBackendError(null);
      })
      .catch(() => setBackendError('Khong ket noi duoc backend AI (Flask cong 5000).'));
  }, []);

  // Liet ke camera that khi mo man hinh + khi thiet bi thay doi (cam/rut iPhone)
  useEffect(() => {
    const refresh = () => {
      navigator.mediaDevices
        ?.enumerateDevices?.()
        .then((ds) => setVideoDevices(ds.filter((d) => d.kind === 'videoinput')))
        .catch(() => {});
    };
    refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
  }, []);

  // Theo doi kich thuoc vung hien thi de ve box overlay dung vi tri
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const update = () => setViewSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMonitoring]);

  // Chon camera trong danh sach: CAM-01 = may tinh, CAM-02 = dien thoai (IP)
  const handleSelectCamera = (kind: CamKind) => {
    if (kind === 'device') {
      setSelectedDeviceId('');
      setSourceMode('webcam');
      setIsMonitoring(true);
    } else {
      // CAM-02 (dien thoai): chua co URL thi mo cau hinh
      if (!ipUrl) {
        setIpUrlInput('');
        setShowIpModal(true);
        return;
      }
      setSourceMode('ip');
      setIsMonitoring(true);
    }
  };

  // Luu URL camera dien thoai (co dinh)
  const handleSaveIpUrl = () => {
    const url = ipUrlInput.trim();
    if (!url) return;
    setIpUrl(url);
    try {
      localStorage.setItem('ipCameraUrl', url);
    } catch {
      // bo qua
    }
    setShowIpModal(false);
    setSourceMode('ip');
    setIsMonitoring(true);
  };

  // Thiet lap nguon hinh (webcam / video mau / upload)
  useEffect(() => {
    setDetections([]);
    setIsAlert(false);
    setHighestConf(0);
    setDisplayImage(null);

    // Dung webcam cu neu co
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (!isMonitoring) {
      if (video) video.pause();
      return;
    }

    if (sourceMode === 'webcam') {
      const videoConstraint: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : { facingMode: 'environment' };
      navigator.mediaDevices
        .getUserMedia({ video: videoConstraint, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          // Sau khi co quyen -> liet ke cac camera (luc nay moi co ten thiet bi)
          navigator.mediaDevices.enumerateDevices().then((devices) => {
            setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
          });
        })
        .catch((err) => setBackendError(`Khong mo duoc webcam: ${err.message}`));
    } else if (sourceMode === 'upload' && uploadUrl && !uploadIsImage) {
      if (video) {
        video.srcObject = null;
        video.src = uploadUrl;
        video.loop = true;
        video.muted = true;
        video.play().catch(() => {});
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, sourceMode, uploadUrl, uploadIsImage, selectedDeviceId]);

  // Vong lap nhan dien
  useEffect(() => {
    if (!isMonitoring) return;
    // Anh tinh: chi nhan dien mot lan khi tai xong (xu ly o onLoad)
    if (sourceMode === 'upload' && uploadIsImage) return;

    const timer = window.setInterval(() => {
      void captureAndDetect();
    }, DETECT_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, sourceMode, uploadIsImage, fireThreshold, smokeThreshold]);

  const evaluateAlert = (dets: Detection[]) => {
    let alert = false;
    let highest = 0;
    const triggered: string[] = [];
    for (const d of dets) {
      const name = d.class_name.toLowerCase();
      const threshold = name === 'fire' ? fireThreshold : name === 'smoke' ? smokeThreshold : 1;
      if (name === 'fire' || name === 'smoke') {
        highest = Math.max(highest, d.confidence);
        if (d.confidence >= threshold) {
          alert = true;
          if (!triggered.includes(name)) triggered.push(name);
        }
      }
    }
    return { alert, highest, triggered };
  };

  // Xu ly ket qua nhan dien chung (dung cho ca webcam va IP)
  function applyResult(result: { detections: Detection[]; image: string }) {
    setBackendError(null);
    setDetections(result.detections);
    setDisplayImage(result.image);
    const { alert, highest, triggered } = evaluateAlert(result.detections);
    setHighestConf(highest);
    setIsAlert(alert);
    if (alert && Date.now() - lastAlertRef.current > ALERT_COOLDOWN_MS) {
      lastAlertRef.current = Date.now();
      raiseAlert(triggered, highest, result.image);
    }
  }

  // Nhan dien tu camera dien thoai qua IP (backend doc luong)
  async function detectFromIp() {
    if (!ipUrl) return;
    busyRef.current = true;
    try {
      const detectFloor = Math.min(0.25, fireThreshold, smokeThreshold);
      const result = await detectIp(ipUrl, detectFloor);
      applyResult(result);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Loi camera IP.');
    } finally {
      busyRef.current = false;
    }
  }

  async function captureAndDetect() {
    if (busyRef.current) return;
    if (sourceMode === 'ip') {
      await detectFromIp();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Lay phan tu media dang hoat dong
    const isImg = sourceMode === 'upload' && uploadIsImage;
    const media: HTMLVideoElement | HTMLImageElement | null = isImg ? imgRef.current : videoRef.current;
    if (!media) return;

    const natW = isImg ? (media as HTMLImageElement).naturalWidth : (media as HTMLVideoElement).videoWidth;
    const natH = isImg ? (media as HTMLImageElement).naturalHeight : (media as HTMLVideoElement).videoHeight;
    if (!natW || !natH) return;
    setFrameSize({ w: natW, h: natH });

    busyRef.current = true;
    try {
      canvas.width = natW;
      canvas.height = natH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(media as CanvasImageSource, 0, 0, natW, natH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

      // San phat hien thap de luon ve box som; canh bao (coi) dung nguong rieng theo lop.
      const detectFloor = Math.min(0.25, fireThreshold, smokeThreshold);
      const result = await detectFrame(dataUrl, detectFloor);
      applyResult(result);
    } catch (err) {
      setBackendError(err instanceof Error ? err.message : 'Loi nhan dien.');
    } finally {
      busyRef.current = false;
    }
  }

  function raiseAlert(triggered: string[], highest: number, annotatedImage: string) {
    const type: AlertEvent['type'] = triggered.includes('fire') ? 'fire' : 'smoke';
    const now = new Date();
    const alertEvent: AlertEvent = {
      id: `${type === 'fire' ? 'FIRE' : 'SMOK'}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      cameraName: `${activeCamId} (${activeCamLabel})`,
      type,
      severity: type === 'fire' ? 'critical' : 'high',
      zaloStatus: telegramConfig.autoSendEnabled ? 'Đang gửi Telegram...' : 'Không cấu hình gửi',
      zaloSuccess: 'none',
      acknowledged: false,
      imageUrl: annotatedImage,
    };
    onAddAlert(alertEvent);

    const label = type === 'fire' ? 'LỬA/CHÁY' : 'KHÓI';
    const message =
      `🔥 CẢNH BÁO ${label} tại ${activeCamId} (${activeCamLabel}). ` +
      `Độ tin cậy ${Math.round(highest * 100)}%. Thời gian ${alertEvent.timestamp} ${alertEvent.date}. ` +
      `Vui lòng kiểm tra ngay!`;

    // Tu dong gui Telegram (kem anh snapshot) neu bat
    if (telegramConfig.autoSendEnabled && telegramConfig.botToken && telegramConfig.chatId) {
      sendTelegram({
        botToken: telegramConfig.botToken,
        chatId: telegramConfig.chatId,
        message,
        image: annotatedImage,
      })
        .then((r) => {
          if (r.ok) onNotify('Đã gửi Telegram cảnh báo (kèm ảnh).', 'success');
          else onNotify(`Gửi Telegram thất bại: ${r.error || 'kiểm tra token/chat_id'}`, 'warn');
        })
        .catch((e) => onNotify(`Lỗi gửi Telegram: ${e.message}`, 'warn'));
    }
  }

  // Khi tai anh tinh xong -> nhan dien mot lan
  const handleImageLoaded = () => {
    if (sourceMode === 'upload' && uploadIsImage && isMonitoring) {
      void captureAndDetect();
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadUrl) URL.revokeObjectURL(uploadUrl);
    const url = URL.createObjectURL(file);
    setUploadUrl(url);
    setUploadIsImage(file.type.startsWith('image/'));
    setSourceMode('upload');
    setIsMonitoring(true);
  };

  const isImgMode = sourceMode === 'upload' && uploadIsImage;
  // Co luong video song (muot) -> ve box overlay; nguoc lai dung anh backend.
  const useLiveOverlay = sourceMode === 'webcam' || (sourceMode === 'upload' && !uploadIsImage);

  // Tinh vi tri box overlay tren video song (xu ly letterbox object-contain).
  const overlayBoxes = (() => {
    if (!useLiveOverlay) return [] as {
      key: number; left: number; top: number; width: number; height: number; color: string; label: string;
    }[];
    const { w: nW, h: nH } = frameSize;
    const { w: W, h: H } = viewSize;
    if (!nW || !nH || !W || !H) return [];
    const scale = Math.min(W / nW, H / nH);
    const offX = (W - nW * scale) / 2;
    const offY = (H - nH * scale) / 2;
    return detections.map((d, i) => {
      const name = d.class_name.toLowerCase();
      const color = name === 'fire' ? '#ff4500' : '#90a4b0';
      return {
        key: i,
        left: offX + d.box.x1 * scale,
        top: offY + d.box.y1 * scale,
        width: (d.box.x2 - d.box.x1) * scale,
        height: (d.box.y2 - d.box.y1) * scale,
        color,
        label: `${d.label} ${Math.round(d.confidence * 100)}%`,
      };
    });
  })();

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[calc(100vh-100px)]">
      {/* LEFT BLOCK: Real Detection Viewer */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Source selector */}
        <div className="glass-panel p-2 rounded-2xl flex flex-wrap items-center gap-2 shadow-lg">
          <span className="px-3 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Đang xem: {activeCamId}
          </span>
          <label className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border bg-surface-high border-white/5 text-on-surface-variant hover:text-white">
            <Upload className="w-4 h-4" />
            <span>Tải ảnh/video</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUploadFile} />
          </label>

          {backendError && (
            <span className="ml-auto text-[11px] font-bold text-red-300 bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5" /> {backendError}
            </span>
          )}
        </div>

        {/* Large Stream Screen */}
        <div
          ref={screenRef}
          className={`relative aspect-video glass-panel rounded-2xl overflow-hidden shadow-2xl group select-none border ${
            isAlert ? 'border-red-500/70 ring-4 ring-red-500/20' : 'border-brand-blue/20'
          }`}
        >
          {isMonitoring ? (
            <>
              {/* Nguon bat (an phia sau) de chup khung gui AI - chi webcam/video */}
              {sourceMode === 'webcam' || (sourceMode === 'upload' && !uploadIsImage) ? (
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain"
                  autoPlay
                  muted
                  playsInline
                />
              ) : null}
              {sourceMode === 'ip' && !displayImage && (
                <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant text-xs z-[3]">
                  Đang kết nối camera điện thoại…
                </div>
              )}
              {isImgMode && uploadUrl && (
                <img
                  ref={imgRef}
                  src={uploadUrl}
                  onLoad={handleImageLoaded}
                  className="absolute inset-0 w-full h-full object-contain"
                  alt="upload"
                />
              )}

              {/* Video song (webcam/upload-video): ve box overlay nhe -> giu hinh muot */}
              {useLiveOverlay && overlayBoxes.map((b) => (
                <div
                  key={b.key}
                  className="absolute z-[4] pointer-events-none rounded-[4px]"
                  style={{
                    left: b.left,
                    top: b.top,
                    width: b.width,
                    height: b.height,
                    border: `3px solid ${b.color}`,
                    boxShadow: `0 0 12px ${b.color}99`,
                    transition: 'all 120ms linear',
                  }}
                >
                  <span
                    className="absolute -top-[22px] left-0 text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow"
                    style={{ background: b.color, color: '#fff' }}
                  >
                    {b.label}
                  </span>
                </div>
              ))}

              {/* Khong co luong song (IP / anh tinh): dung anh backend da ve box */}
              {displayImage && !useLiveOverlay && (
                <img
                  src={displayImage}
                  className="absolute inset-0 w-full h-full object-contain z-[4]"
                  alt="Ket qua nhan dien"
                />
              )}

              {/* Scanning grid + line */}
              <div className="absolute inset-0 pointer-events-none z-[5]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              <div className="scanline z-[5]" />

              {/* Top-left LIVE pill */}
              <div className="absolute top-5 left-5 flex flex-col gap-1.5 z-10">
                <div className="flex items-center gap-2 bg-surface-lowest/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/5 shadow">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="font-mono text-[10px] text-white tracking-widest uppercase font-extrabold">
                    {sourceMode === 'webcam' ? 'WEBCAM LIVE' : sourceMode === 'ip' ? 'IP CAMERA LIVE' : 'NGUỒN TẢI LÊN'}
                  </span>
                </div>
                <div className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-lowest/40 backdrop-blur-sm px-2 py-0.5 rounded border border-white/5 w-fit">
                  YOLOv8 · best.pt
                </div>
              </div>

              {/* Top-right camera id */}
              <div className="absolute top-5 right-5 z-10">
                <div className="bg-surface-lowest/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5 text-right shadow">
                  <div className="text-brand-blue font-extrabold text-sm tracking-tight">{activeCamId}</div>
                  <div className="text-[11px] text-on-surface font-semibold mt-0.5 max-w-[160px] truncate">{activeCamLabel}</div>
                </div>
              </div>

              {/* Bottom HUD */}
              <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-10">
                <div className="flex gap-3">
                  <div className="bg-surface-lowest/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                    <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wider">Đối tượng</p>
                    <span className="font-mono text-xs font-bold text-brand-cyan-light">{detections.length}</span>
                  </div>
                  <div className="bg-surface-lowest/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                    <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-wider">Độ tin cậy</p>
                    <span className={`font-mono text-xs font-bold ${isAlert ? 'text-red-400' : 'text-brand-green'}`}>
                      {Math.round(highestConf * 100)}%
                    </span>
                  </div>
                </div>

                {isAlert ? (
                  <div className="flex items-center gap-2 bg-red-500/25 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/50 shadow shadow-red-500/20 animate-pulse">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 font-bold text-[10px] uppercase tracking-wider">Phát hiện cháy/khói</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-brand-green/20 backdrop-blur-md px-4 py-2 rounded-full border border-brand-green/35 shadow shadow-brand-green/10">
                    <ShieldCheck className="w-4 h-4 text-brand-green" />
                    <span className="text-brand-green font-bold text-[10px] uppercase tracking-wider">An toàn</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-surface-lowest flex flex-col items-center justify-center gap-3">
              <VideoOff className="w-10 h-10 text-on-surface-variant/40" />
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">Giám sát đang tắt</h4>
                <p className="text-xs text-on-surface-variant mt-1">Chọn nguồn và ấn "Bật giám sát" để chạy AI nhận diện</p>
              </div>
            </div>
          )}
        </div>

        {/* Control bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex gap-3">
            <button
              onClick={() => setIsMonitoring((v) => !v)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 border ${
                isMonitoring ? 'bg-red-500 text-white border-red-500/20 shadow-md shadow-red-500/10' : 'bg-brand-cyan text-surface-lowest border-brand-cyan/20'
              }`}
            >
              {isMonitoring ? (<><VideoOff className="w-4 h-4" /><span>Tắt giám sát</span></>) : (<><Video className="w-4 h-4" /><span>Bật giám sát</span></>)}
            </button>

            <div className="px-5 py-2.5 bg-surface-high text-white border border-white/5 rounded-xl text-xs font-bold flex items-center gap-2">
              {isMonitoring && !uploadIsImage ? <Loader2 className="w-4 h-4 animate-spin text-brand-cyan-light" /> : <CameraIcon className="w-4 h-4 text-on-surface-variant" />}
              <span>Ngưỡng: Lửa {systemSettings.fireConfidence}% · Khói {systemSettings.smokeConfidence}%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setActiveTab(AppTab.HISTORY)} className="px-5 py-2.5 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan-light border border-brand-cyan/25 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
              <History className="w-4 h-4" /><span>Xem lịch sử</span>
            </button>
            <button onClick={() => setActiveTab(AppTab.ALERTS)} className="px-5 py-2.5 bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan-light border border-brand-cyan/35 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
              <Send className="w-4 h-4" /><span>Xem cảnh báo</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT BLOCK: Camera list */}
      <aside className="w-full xl:w-80 flex flex-col gap-5 shrink-0">
        <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Danh sách Camera</h3>
            <span className="bg-brand-green/10 text-brand-green text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-brand-green/20">
              LIVE: {cameraList.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[360px] xl:max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar flex-1">
            {cameraList.map((cam) => {
              const isPhone = cam.kind === 'ip';
              const isSelected = isPhone ? sourceMode === 'ip' : sourceMode === 'webcam';
              const notConfigured = isPhone && !ipUrl;
              return (
                <div
                  key={cam.camId}
                  onClick={() => handleSelectCamera(cam.kind)}
                  className={`relative group cursor-pointer border-2 rounded-xl overflow-hidden transition-all duration-200 ${
                    isSelected ? 'border-brand-blue ring-4 ring-brand-blue/15' : 'border-outline-variant/30 hover:border-brand-blue/50'
                  }`}
                >
                  <div className="aspect-video bg-surface-lowest relative overflow-hidden flex items-center justify-center">
                    <Webcam className="w-8 h-8 text-on-surface-variant/40" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-surface-lowest/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white border border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full ${notConfigured ? 'bg-on-surface-variant/40' : 'bg-brand-green animate-pulse'}`} />
                      {cam.camId}
                    </div>
                    <span className={`absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${isPhone ? 'bg-brand-cyan/15 text-brand-cyan-light border-brand-cyan/20' : 'bg-brand-blue/15 text-brand-blue border-brand-blue/20'}`}>
                      {isPhone ? 'Điện thoại' : 'Máy tính'}
                    </span>
                  </div>
                  <div className={`p-3 flex justify-between items-center ${isSelected ? 'bg-surface-high' : 'bg-surface-low'}`}>
                    <div className="space-y-0.5 text-left">
                      <div className={`text-[11px] font-bold ${isSelected ? 'text-brand-blue' : 'text-white'}`}>
                        {isSelected ? 'Đang xem' : notConfigured ? 'Chưa cấu hình' : 'Sẵn sàng'}
                      </div>
                      <div className="text-[10px] text-on-surface-variant truncate max-w-[150px]">{cam.label}</div>
                    </div>
                    {isPhone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIpUrlInput(ipUrl); setShowIpModal(true); }}
                        className="text-[10px] font-bold text-brand-cyan-light hover:text-white px-2 py-1 rounded-lg bg-surface-high border border-white/5 cursor-pointer shrink-0"
                      >
                        {ipUrl ? 'Sửa URL' : 'Cấu hình'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-xl flex flex-col gap-3">
          <h4 className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-brand-cyan-light" /> Trạng thái AI Edge
          </h4>
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Backend YOLOv8</span>
            <span className={`font-mono font-bold ${backendError ? 'text-red-400' : 'text-brand-green'}`}>{backendError ? 'Mất kết nối' : 'Sẵn sàng'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant font-medium">Tự gửi Telegram</span>
            <span className={`font-mono font-bold ${telegramConfig.autoSendEnabled ? 'text-brand-green' : 'text-on-surface-variant'}`}>{telegramConfig.autoSendEnabled ? 'Đang bật' : 'Tắt'}</span>
          </div>
        </div>
      </aside>

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modal cau hinh URL camera dien thoai (CAM-02) */}
      {showIpModal && (
        <div className="fixed inset-0 bg-surface-lowest/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setShowIpModal(false)} className="absolute top-4 right-4 text-on-surface-variant hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 flex items-center justify-center text-brand-cyan-light">
                <Webcam className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Camera điện thoại (CAM-02)</h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">Nhập URL luồng từ app trên điện thoại</p>
              </div>
            </div>

            <input
              type="text"
              value={ipUrlInput}
              onChange={(e) => setIpUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveIpUrl()}
              placeholder="http://192.168.1.5:8081/video"
              className="w-full bg-surface-high border border-outline-variant/30 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-brand-cyan outline-none"
            />

            <div className="mt-3 text-[11px] text-on-surface-variant leading-relaxed bg-surface-low/50 border border-white/5 rounded-xl p-3 space-y-1">
              <p className="font-bold text-white">Cách lấy URL (iPhone):</p>
              <p>1. Cài app <b className="text-white">IP Camera Lite</b> (hoặc tương tự) trên iPhone.</p>
              <p>2. Mở app → bấm <b className="text-white">Turn on IP Camera Server</b>.</p>
              <p>3. App hiện địa chỉ, ví dụ <code className="text-brand-cyan-light">http://192.168.1.5:8081</code> → thêm <code className="text-brand-cyan-light">/video</code> vào cuối.</p>
              <p>4. iPhone và máy tính phải <b className="text-white">cùng wifi</b>.</p>
            </div>

            <button
              onClick={handleSaveIpUrl}
              className="w-full mt-4 py-3 bg-brand-cyan hover:bg-brand-cyan-light text-surface-lowest font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-cyan/25"
            >
              Lưu &amp; Kết nối CAM-02
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
