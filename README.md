# Smart Fire Monitoring — Hệ thống giám sát phát hiện cháy/khói bằng AI

[![Qodana](https://github.com/xlaw29/KCPM/actions/workflows/qodana.yml/badge.svg)](https://github.com/xlaw29/KCPM/actions/workflows/qodana.yml)

Phát hiện **cháy/khói** thời gian thực bằng model **YOLOv8** (`backend/model/best.pt`),
hiển thị trên giao diện web **Smart Fire Monitoring** (React). Hỗ trợ camera máy tính,
camera điện thoại (IP), tải ảnh/video, vẽ bounding box, tự sinh cảnh báo và gửi **Telegram**.

> Model đã được đính kèm sẵn trong `backend/model/best.pt`, nên **không cần train lại** — clone về là chạy được ngay.

## Cấu trúc thư mục

```
fire_detection_project/
├── backend/                  # Backend AI (Flask + YOLOv8)
│   ├── run.py                #   điểm khởi chạy (cổng 5001)
│   ├── requirements.txt
│   ├── fire_web/             #   package Flask
│   │   ├── app.py            #     các route API
│   │   └── detector.py       #     FireDetector (suy luận + vẽ box)
│   ├── model/                #   best.pt, last.pt (model đã train)
│   ├── media/sample.mp4      #   video mẫu cho màn giám sát
│   └── static/outputs/       #   video kết quả (runtime)
│
├── frontend/                 # Giao diện chính (React + Vite + Tailwind)
│   ├── src/                  #   App, components, api.ts
│   └── package.json
│
├── dataset/                  # Dữ liệu train YOLO (fire/smoke) + raw export
├── test-media/               # Ảnh/video cháy để thử nghiệm
└── .venv/                    # Môi trường Python
```

## Kiến trúc

```
frontend (React, :3000) ──proxy /api──► backend (Flask, :5001) ──► YOLOv8 best.pt
```

Frontend gọi `/api/*`, được Vite proxy chuyển sang Flask (xem `frontend/vite.config.ts`).

## ⚙️ Cần cài sẵn trên máy (1 lần)

| Phần mềm | Phiên bản | Tải ở đâu | Kiểm tra đã cài |
|---|---|---|---|
| **Python** | 3.10 trở lên | https://www.python.org/downloads/ | `python3 --version` |
| **Node.js** | 18 trở lên | https://nodejs.org/ | `node --version` |
| **Git** | bất kỳ | https://git-scm.com/downloads | `git --version` |

> Không cần GPU. Máy chỉ có CPU vẫn chạy được, chỉ chậm hơn một chút.

---

## 🚀 Hướng dẫn chạy từng bước

Bạn sẽ cần mở **2 cửa sổ Terminal** (Terminal trên macOS/Linux, hoặc PowerShell trên Windows):
một cho **Backend (AI)**, một cho **Frontend (giao diện)**. Cả hai phải chạy cùng lúc.

### Bước 0 — Tải mã nguồn về
```bash
git clone https://github.com/ngshini/fire_detection_project.git
cd fire_detection_project
```

### Bước 1 — Chạy Backend AI (Terminal 1)

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv                 # tạo môi trường Python riêng (chỉ lần đầu)
source .venv/bin/activate             # bật môi trường (thấy chữ (.venv) ở đầu dòng là đúng)
pip install -r requirements.txt       # cài thư viện (lần đầu ~2-5 phút, hơi lâu)
PORT=5001 python run.py               # khởi chạy backend
```

**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv                  # tạo môi trường Python riêng (chỉ lần đầu)
.venv\Scripts\activate                # bật môi trường
pip install -r requirements.txt       # cài thư viện (lần đầu ~2-5 phút)
$env:PORT=5001; python run.py         # khởi chạy backend
```

✅ Thành công khi thấy dòng: `Running on http://127.0.0.1:5001`
**Giữ nguyên terminal này, đừng tắt.**

> **Những lần sau** chỉ cần: `cd backend` → bật môi trường (`source .venv/bin/activate` hoặc `.venv\Scripts\activate`) → `PORT=5001 python run.py`. Không phải cài lại thư viện.

### Bước 2 — Chạy Frontend giao diện (Terminal 2 — mở cửa sổ MỚI)

```bash
cd fire_detection_project/frontend
npm install                           # tải thư viện giao diện (chỉ lần đầu, ~1-3 phút)
npm run dev                           # khởi chạy giao diện
```

✅ Thành công khi thấy: `Local: http://localhost:3000/`

### Bước 3 — Mở trình duyệt
Vào **http://localhost:3000** → đăng nhập → vào **Giám sát camera** →
chọn **CAM-01** (camera máy tính) hoặc **Tải ảnh/video** → bấm **Bật giám sát**.
Khi có cháy/khói, hệ thống sẽ khoanh vùng và cảnh báo.

> Lần đầu bật camera, trình duyệt sẽ hỏi quyền — chọn **Cho phép (Allow)**.

---

### 🔔 (Tùy chọn) Gửi cảnh báo về Telegram
Vào tab **Cấu hình Telegram** → dán **Bot Token** (tạo từ **@BotFather**) và **Chat ID**
(lấy từ `https://api.telegram.org/bot<TOKEN>/getUpdates`) → **Lưu**.
Từ đó mỗi lần phát hiện cháy, hệ thống tự gửi ảnh cảnh báo về Telegram của bạn.
Token chỉ lưu trong trình duyệt, **không** nằm trong mã nguồn.

---

## ❓ Lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Giao diện báo **"Không kết nối được backend AI"** | Backend (Terminal 1) chưa chạy, hoặc đã tắt. Quay lại Bước 1 chạy lại. |
| `python3: command not found` | Chưa cài Python, hoặc trên Windows dùng lệnh `python` thay cho `python3`. |
| `Address already in use` / cổng bận | Cổng 5001 đang bị chiếm. Dùng cổng khác, ví dụ `PORT=5002 python run.py`, rồi sửa `target` trong `frontend/vite.config.ts` thành `http://127.0.0.1:5002`. |
| `npm: command not found` | Chưa cài Node.js (xem bảng phần cài đặt). |
| Camera không mở được | Trình duyệt chặn quyền. Vào cài đặt trình duyệt → cho phép Camera cho `localhost`. |
| Cài `pip install` bị lỗi | Nâng cấp pip trước: `pip install --upgrade pip` rồi cài lại. |

## API backend

| Endpoint | Mô tả |
|---|---|
| `GET  /api/health` | Kiểm tra model |
| `POST /api/detect-frame` | Nhận 1 khung hình → detection + ảnh đã vẽ box |
| `POST /api/detect-upload` | Nhận ảnh/video → xử lý cả file |
| `POST /api/detect-ip` | Nhận dạng từ camera IP (điện thoại) |
| `POST /api/telegram/send` | Gửi cảnh báo Telegram (kèm ảnh) |
| `POST /api/auth/register` | Đăng ký tài khoản mới (lưu vào CSDL) |
| `POST /api/auth/login` | Đăng nhập (kiểm tra với CSDL) |
| `GET  /api/users` | Danh sách tài khoản |
| `GET  /api/detections` | Lịch sử phát hiện (lọc `?type=`, `?acknowledged=`, `?limit=`) |
| `POST /api/detections` | Lưu 1 sự kiện phát hiện cháy/khói (kèm snapshot) |
| `POST /api/detections/<id>/acknowledge` | Xác nhận (duyệt) một sự kiện |
| `GET  /api/stats` | Thống kê nhanh cho dashboard |

## 🗄️ Cơ sở dữ liệu (SQLite)

Hệ thống lưu **tài khoản** và **lịch sử phát hiện cháy/khói** trong một file **SQLite**
(`backend/data/fire_detection.db`) — dùng `sqlite3` sẵn trong Python, **không cần cài
thêm** phần mềm CSDL nào. File tự tạo lần đầu chạy backend.

**2 bảng chính:**

| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản: email, mật khẩu (băm PBKDF2-SHA256 + salt), họ tên, vai trò, thời điểm tạo/đăng nhập |
| `detections` | Mỗi lần phát hiện: loại (cháy/khói), độ tin cậy, mức độ, camera, số box, ảnh snapshot, đã xác nhận hay chưa, thời gian |

**Tài khoản mặc định** (tự tạo lần đầu):

| Email / Tên đăng nhập | Mật khẩu | Vai trò |
|---|---|---|
| `admin` | `admin123` | admin |
| `sinh@gmail.com` | `111111` | operator |

Ảnh snapshot của mỗi cảnh báo được lưu ở `backend/static/snapshots/`. Cả file CSDL và
thư mục snapshot đều đã được `.gitignore` bỏ qua (dữ liệu runtime, không commit).

## Biến môi trường (tùy chọn)

```bash
FIRE_MODEL_PATH=backend/model/best.pt   # đường dẫn model
FIRE_CONFIDENCE=0.45                     # ngưỡng tin cậy mặc định
FIRE_IMGSZ=1280                          # độ phân giải suy luận (lớn = bắt lửa nhỏ tốt hơn)
```

## Train lại model (trên máy GPU)

```bash
cd fire_detection_project
yolo detect train model=yolov8s.pt data=dataset/data.yaml epochs=100 imgsz=1280 batch=16 device=0
```
Nhớ sửa dòng `path:` trong `dataset/data.yaml` cho đúng máy GPU. Train xong copy
`runs/detect/train/weights/best.pt` về `backend/model/best.pt`, khởi động lại backend.
```

## 🔍 Kiểm tra chất lượng mã nguồn (Qodana)

Repo đã tích hợp **Qodana** — static analysis của JetBrains — chạy tự động trên
GitHub Actions mỗi khi push/PR vào `main`.

- Backend (Python): dùng `qodana-python-community` — **miễn phí**, chạy mặc định.
- Frontend (JS/TS): dùng `qodana-js` — cần license Ultimate, bật bằng biến
  `QODANA_JS_ENABLED=true`.

Cấu hình: `qodana-backend.yaml`, `qodana-frontend.yaml`, `.github/workflows/qodana.yml`.
Hướng dẫn chi tiết (xem báo cáo, chạy local, quality gate): **[docs/qodana.md](docs/qodana.md)**.
