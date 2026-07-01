# Smart Fire Monitoring — Giao diện chính (React) + AI YOLOv8

Giao diện giám sát phát hiện cháy/khói, dùng **model YOLOv8 thật** (`../backend/model/best.pt`)
chạy qua backend Flask. Màn **Giám sát camera** nhận diện trực tiếp từ webcam,
video mẫu hoặc file tải lên, vẽ bounding box thật và tự sinh cảnh báo + gửi Zalo.

## Kiến trúc

```
React (Vite, cổng 3000)  --proxy /api-->  Flask (cổng 5000)  -->  YOLOv8 best.pt
        UI chính                              backend AI            nhận diện cháy/khói
```

- Frontend gọi `/api/*`, được Vite proxy chuyển sang Flask (xem `vite.config.ts`).
- Backend AI: `../backend/fire_web` với các endpoint:
  - `POST /api/detect-frame` — nhận 1 khung hình, trả detection + ảnh đã vẽ box
  - `GET  /api/media/sample` — phục vụ video mẫu (`backend/media/sample.mp4`)
  - `POST /api/zalo/send` — gửi tin nhắn Zalo OA thật

## Chạy (mở 2 terminal)

**1) Backend AI (Flask):**

```bash
cd ../backend                 # vào fire_detection_project/backend
source ../.venv/bin/activate  # hoặc tạo venv + pip install -r requirements.txt
python run.py                 # chạy ở http://127.0.0.1:5000
```

**2) Frontend (React):**

```bash
npm install
npm run dev                # mở http://localhost:3000
```

Đăng nhập (bấm nút bất kỳ) → vào **Giám sát camera** → chọn nguồn
(**Video mẫu** / **Webcam** / **Tải ảnh-video**) → **Bật giám sát**.

## Ngưỡng & cảnh báo

- Ngưỡng tin cậy Lửa/Khói chỉnh ở tab **Cài đặt** (mặc định 75% / 65%).
- Khi vượt ngưỡng: tự tạo sự kiện ở tab **Cảnh báo** + **Lịch sử** (kèm ảnh có box),
  và nếu bật "tự gửi Zalo" sẽ gọi API Zalo OA.

## Zalo thật

Cần **access token Zalo OA hợp lệ** và **user_id** người nhận (người đã nhắn tin
cho OA) — nhập ở tab **Kết nối Zalo**, bấm **Lưu**, rồi **Gửi thử**.
Lưu ý: API `message/cs` của Zalo dùng `user_id`, không gửi trực tiếp tới số điện thoại
(số điện thoại cần dịch vụ ZNS có template riêng).
