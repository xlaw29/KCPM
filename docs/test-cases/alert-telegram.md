# Kiểm thử chức năng — Quản lý cảnh báo & thông báo Telegram

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| Chức năng | Quản lý cảnh báo (F52–F63) và thông báo Telegram (F64–F73) |
| Số test case | **22** (F52 → F73) |
| Mã nguồn liên quan | `frontend/src/alerts.ts`, `frontend/src/components/CameraMonitorView.tsx`, `frontend/src/App.tsx`, `frontend/src/components/TelegramConfigView.tsx`, `frontend/src/components/HistoryView.tsx`, `backend/fire_web/app.py`, `backend/fire_web/db.py` |
| Bộ test tự động | `frontend/src/alerts.test.ts` (25 test), `backend/tests/test_alert_events_db.py` (8 test), `backend/tests/test_alert_telegram_api.py` (14 test) |
| Công cụ | `node --test` + `tsx` (frontend), `unittest` (thư viện chuẩn Python) + Flask test client (backend) |
| Ngày chạy | 10/11/2026 |
| Kết quả | **22/22 PASS** — 25/25 test frontend, 22/22 test backend (không fail, không skip) |

### Mục tiêu

1. Cảnh báo chỉ kích hoạt khi độ tin cậy của `fire`/`smoke` đạt ngưỡng đã cấu hình.
2. Mức độ nghiêm trọng (`critical`/`high`/`medium`) phân loại đúng theo lớp và độ tin cậy.
3. Cooldown 8 giây chặn cảnh báo trùng lặp đúng thời điểm biên.
4. Danh sách cảnh báo trả đủ trường, sắp xếp mới nhất trước, lọc và phân trang chính xác.
5. Xác nhận cảnh báo cập nhật đúng trạng thái và người xác minh.
6. Cấu hình Telegram hợp lệ được chấp nhận, không hợp lệ bị chặn kèm thông báo lỗi.
7. Gửi Telegram đúng nội dung/đúng loại request; ghi nhận `sent`/`failed` vào nhật ký khi gửi lỗi.

---

## 2. Bảng tổng hợp kết quả

| ID | Tên test case | Loại | Kết quả |
|---|---|---|---|
| F52 | Không có đối tượng → không cảnh báo | Tự động | PASS |
| F53 | Độ tin cậy dưới ngưỡng → không cảnh báo | Tự động | PASS |
| F54 | Độ tin cậy bằng đúng ngưỡng → cảnh báo | Tự động (biên) | PASS |
| F55 | Ngưỡng riêng cho lửa và khói | Tự động | PASS |
| F56 | Lửa ≥ 70% → `critical` | Tự động (biên) | PASS |
| F57 | Lửa < 70% → `high` | Tự động (biên) | PASS |
| F58 | Khói ≥ 60% → `high`, dưới 60% → `medium` | Tự động (biên) | PASS |
| F59 | Cooldown 8 giây giữa 2 cảnh báo | Tự động (biên) | PASS |
| F60 | Danh sách cảnh báo đầy đủ trường + chi tiết/404 | Tự động | PASS |
| F61 | Lọc theo loại/camera/từ khóa/mức độ/xác nhận + phân trang | Tự động | PASS |
| F62 | Xác nhận cảnh báo + 404 khi không tồn tại | Tự động | PASS |
| F63 | Lưu cảnh báo: severity, snapshot, `telegram_status` | Tự động | PASS |
| F64 | Cấu hình Telegram hợp lệ | Tự động | PASS |
| F65 | Thiếu Bot Token → báo lỗi | Tự động | PASS |
| F66 | Bot Token sai định dạng → báo lỗi | Tự động | PASS |
| F67 | Thiếu Chat ID → báo lỗi | Tự động | PASS |
| F68 | Chat ID sai định dạng → báo lỗi | Tự động | PASS |
| F69 | Chỉ sẵn sàng gửi khi bật tự động + cấu hình hợp lệ | Tự động | PASS |
| F70 | Nội dung tin nhắn cảnh báo đúng định dạng | Tự động | PASS |
| F71 | API gửi Telegram thiếu tham số → `400` | Tự động (API) | PASS |
| F72 | Gửi thành công: `sendMessage` / `sendPhoto` | Tự động (API, mock) | PASS |
| F73 | Gửi thất bại → `ok: false` và ghi nhật ký `failed` | Tự động (API, mock) | PASS |

---

## 3. Chi tiết test case

### Nhóm A — Quản lý cảnh báo (F52–F63)

#### F52 — Không có đối tượng → không cảnh báo

| | |
|---|---|
| Điều kiện trước | Đang giám sát, ngưỡng lửa 40%, ngưỡng khói 35% |
| Dữ liệu vào | `detections = []`; và trường hợp chỉ có `person` (conf 0.99) |
| Kết quả mong đợi | `alert = false`, `highest = 0`, `triggered = []`; lớp không phải fire/smoke bị bỏ qua hoàn toàn |
| Kết quả thực tế | PASS — `evaluateAlert([], …)` và `evaluateAlert([person])` đều trả về `{alert:false, highest:0, triggered:[]}` |
| Test | `alerts.test.ts` → `F52`, `F52b` |

#### F53 — Độ tin cậy dưới ngưỡng → không cảnh báo

| | |
|---|---|
| Dữ liệu vào | `fire` 0.39 (ngưỡng 0.40); `smoke` 0.34 (ngưỡng 0.35) |
| Kết quả mong đợi | Không cảnh báo; vẫn cập nhật `highest` để hiển thị HUD |
| Kết quả thực tế | PASS — `alert = false`, `highest = 0.39` |
| Test | `F53`, `F53b` |

#### F54 — Độ tin cậy bằng đúng ngưỡng → cảnh báo (biên)

| | |
|---|---|
| Dữ liệu vào | `fire` 0.40, ngưỡng 0.40 |
| Kết quả mong đợi | Cảnh báo kích hoạt (so sánh `>=`) |
| Kết quả thực tế | PASS — `{alert:true, highest:0.4, triggered:['fire']}` |
| Test | `F54` |

#### F55 — Ngưỡng riêng cho lửa và khói

| | |
|---|---|
| Dữ liệu vào | `smoke` 0.35 (ngưỡng khói 0.35); 2 box `fire` cùng vượt ngưỡng; cả `fire` và `smoke` cùng vượt |
| Kết quả mong đợi | `smoke` 0.35 kích hoạt theo ngưỡng khói; mỗi lớp chỉ xuất hiện 1 lần trong `triggered`; `highest` lấy giá trị lớn nhất |
| Kết quả thực tế | PASS — `triggered` không trùng lặp, `highest` đúng |
| Test | `F55`, `F55b`, `F55c` |

#### F56 — Lửa ≥ 70% → `critical`

| | |
|---|---|
| Dữ liệu vào | `classifySeverity(['fire'], 0.70)` và `0.95` |
| Kết quả mong đợi | `critical` |
| Kết quả thực tế | PASS |
| Test | `F56` |

#### F57 — Lửa < 70% → `high`

| | |
|---|---|
| Dữ liệu vào | `classifySeverity(['fire'], 0.69)` |
| Kết quả mong đợi | `high` |
| Kết quả thực tế | PASS |
| Test | `F57` |

#### F58 — Khói ≥ 60% → `high`, dưới 60% → `medium`

| | |
|---|---|
| Dữ liệu vào | `classifySeverity(['smoke'], 0.60)`, `(['smoke'], 0.59)`, `(['suspect'], 0.99)`, `(['suspect'], 0.20)` |
| Kết quả mong đợi | `high`, `medium`, `high`, `medium` |
| Kết quả thực tế | PASS |
| Test | `F58`, `F58b` |

> Ghi chú: trước KAN-20, frontend cứng `fire → critical`, `smoke → high`. Nay dùng chung quy tắc với backend (`_severity_for`) để nhật ký CSDL và cảnh báo hiển thị cùng một mức độ.

#### F59 — Cooldown 8 giây giữa 2 cảnh báo

| | |
|---|---|
| Điều kiện trước | `ALERT_COOLDOWN_MS = 8000` |
| Dữ liệu vào | `lastAlertAt = 0`; chênh lệch 7 999 ms; 8 000 ms; 8 001 ms; cooldown tùy chỉnh 400 ms với 399/500 ms |
| Kết quả mong đợi | `0` → cho phép; 7 999 → chặn; **8 000 → cho phép** (biên); 8 001 → cho phép; 399 → chặn; 500 → cho phép |
| Kết quả thực tế | PASS |
| Test | `F59`, `F59b`, `F59c`, `F59d` |

> Ghi chú: sửa so sánh từ `>` (phải > 8 000 ms) thành `>=` để cooldown đúng “8 giây” như cấu hình.

#### F60 — Danh sách cảnh báo đầy đủ trường + chi tiết/404

| | |
|---|---|
| Điều kiện trước | CSDL có 3 sự kiện |
| Bước | `GET /api/detections`; `GET /api/detections/<id>`; `GET /api/detections/999999` |
| Kết quả mong đợi | `200`, body có `detections`, `total = 3`, `limit`, `offset`; mỗi bản ghi đủ 15 trường (kể cả `telegram_status`); sắp xếp mới nhất trước; chi tiết trả đúng bản ghi; id không tồn tại → `404` |
| Kết quả thực tế | PASS |
| Test | `test_alert_telegram_api.py` → `test_f60_…`, `test_f60b_…`; `test_alert_events_db.py` → `test_stats_include_telegram_counters` |

#### F61 — Lọc và phân trang danh sách

| | |
|---|---|
| Điều kiện trước | 2 sự kiện (fire CAM-01 đã xác nhận, smoke CAM-02 chưa xác nhận) |
| Bước | Lần lượt `?type=fire`, `?camera=CAM-02`, `?q=Điện thoại`, `?severity=critical`, `?acknowledged=false`, `?acknowledged=true`; sau đó `?limit=2&offset=2` và `?limit=9999` |
| Kết quả mong đợi | Mỗi bộ lọc trả đúng 1 bản ghi (hoặc đúng bản ghi tương ứng); `total` giữ nguyên khi phân trang; `limit` bị kẹp tối đa 500 |
| Kết quả thực tế | PASS |
| Test | `test_f61_…`, `test_f61b_…`; `test_list_and_count_with_filters` |

#### F62 — Xác nhận cảnh báo

| | |
|---|---|
| Bước | `POST /api/detections/<id>/acknowledge` với `{operator: "Tran Thi B"}`; gọi lại lần 2; gọi id không tồn tại |
| Kết quả mong đợi | `acknowledged = true`, `acknowledged_by` đúng; gọi lại vẫn giữ trạng thái; id không tồn tại → `404` |
| Kết quả thực tế | PASS |
| Test | `test_f62_…`, `test_f62b_…`, `test_acknowledge_detection_updates_operator` |

#### F63 — Lưu cảnh báo mới

| | |
|---|---|
| Bước | `POST /api/detections` với `telegram_status = pending`, ảnh data URL; trường hợp thứ hai bỏ `type`/`severity`, `telegram_status` không hợp lệ |
| Kết quả mong đợi | `201`; `severity = critical` (fire 0.82); `telegram_status = pending`; snapshot lưu vào `static/snapshots/`; trường hợp 2 suy ra `type = smoke`, `severity = medium`, `telegram_status` chuẩn hóa về `none` |
| Kết quả thực tế | PASS |
| Test | `test_f63_…`, `test_f63b_…`; `test_insert_detection_stores_pending_status`, `test_insert_detection_rejects_unknown_status`, `test_migrate_old_database_adds_telegram_columns` |

---

### Nhóm B — Cấu hình & thông báo Telegram (F64–F73)

#### F64 — Cấu hình Telegram hợp lệ

| | |
|---|---|
| Dữ liệu vào | Token `123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw` + Chat ID `123456789`; Chat ID nhóm `-1001234567890`; kênh `@kenh_canh_bao` |
| Kết quả mong đợi | `validateTelegramConfig` trả về object rỗng (không lỗi); khoảng trắng đầu/cuối được cắt bỏ |
| Kết quả thực tế | PASS |
| Test | `F64`, `F64b` |

#### F65 — Thiếu Bot Token

| | |
|---|---|
| Dữ liệu vào | `botToken = "   "`, `chatId = "123456789"` |
| Kết quả mong đợi | Lỗi `Chưa nhập Bot Token.`; không báo lỗi Chat ID |
| Kết quả thực tế | PASS — UI hiển thị lỗi dưới ô nhập và chặn Lưu/Gửi thử |
| Test | `F65` |

#### F66 — Bot Token sai định dạng

| | |
|---|---|
| Dữ liệu vào | `abc`, `123456789`, `123456789:`, `123456789:short`, `abc:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw` |
| Kết quả mong đợi | Mọi giá trị đều bị từ chối với thông báo định dạng `123456789:AA...` |
| Kết quả thực tế | PASS |
| Test | `F66` |

#### F67 — Thiếu Chat ID

| | |
|---|---|
| Dữ liệu vào | Token hợp lệ, `chatId = ""` |
| Kết quả mong đợi | Lỗi `Chưa nhập Chat ID.` |
| Kết quả thực tế | PASS |
| Test | `F67` |

#### F68 — Chat ID sai định dạng

| | |
|---|---|
| Dữ liệu vào | `abc123`, `12 34`, `12345678901234567890123x`, `@a` |
| Kết quả mong đợi | Bị từ chối với thông báo “phải là số (nhóm có thể âm) hoặc @tên_kênh” |
| Kết quả thực tế | PASS |
| Test | `F68` |

#### F69 — Điều kiện sẵn sàng gửi tự động

| | |
|---|---|
| Dữ liệu vào | 4 tổ hợp: bật + hợp lệ; tắt + hợp lệ; bật + token rỗng; bật + Chat ID sai |
| Kết quả mong đợi | Chỉ tổ hợp đầu trả `true` |
| Kết quả thực tế | PASS — `isTelegramReady` dùng chung cho `App.tsx` và `CameraMonitorView.tsx` |
| Test | `F69` |

#### F70 — Nội dung tin nhắn cảnh báo

| | |
|---|---|
| Dữ liệu vào | `fire`, camera `CAM-01 (Camera máy tính)`, conf 0.834, giờ `14:05:09`, ngày `10/11/2026`; và `smoke` conf 0.5 |
| Kết quả mong đợi | `🔥 CẢNH BÁO LỬA/CHÁY tại CAM-01 (Camera máy tính). Độ tin cậy 83%. Thời gian 14:05:09 10/11/2026. Vui lòng kiểm tra ngay!`; tin khói dùng nhãn `KHÓI` và `50%` |
| Kết quả thực tế | PASS |
| Test | `F70`, `F70b` |

#### F71 — API gửi Telegram thiếu tham số

| | |
|---|---|
| Bước | `POST /api/telegram/send` lần lượt thiếu `bot_token`, thiếu `chat_id`, thiếu `message` |
| Kết quả mong đợi | `400` với thông báo tương ứng từng trường |
| Kết quả thực tế | PASS |
| Test | `test_f71_…` |

#### F72 — Gửi thành công (mock Telegram)

| | |
|---|---|
| Bước | Mock `urllib.request.urlopen` trả `{ok: true}`; gửi không ảnh; gửi kèm ảnh data URL |
| Kết quả mong đợi | `200` + `ok: true`; không ảnh → gọi `sendMessage` với JSON `{chat_id, text}`; có ảnh → gọi `sendPhoto`, `multipart/form-data`, chứa `chat_id`, `photo` và caption tiếng Việt |
| Kết quả thực tế | PASS |
| Test | `test_f72_…`, `test_f72b_…` |

#### F73 — Gửi thất bại và ghi nhật ký

| | |
|---|---|
| Bước | Mock `urlopen` ném `HTTPError 401`; sau đó `POST /api/detections/<id>/telegram` với `ok: true` rồi `ok: false`; thử payload thiếu `ok` và id không tồn tại |
| Kết quả mong đợi | API gửi trả `200` + `ok: false` + `error` bắt đầu `HTTP 401`; nhật ký chuyển `sent` (có `telegram_sent_at`) rồi `failed` (lưu `telegram_error`); thiếu `ok` → `400`; id không tồn tại → `404` |
| Kết quả thực tế | PASS |
| Test | `test_f73_…`, `test_f73b_…`, `test_f73c_…`; `test_record_telegram_result_sent_and_failed`, `test_record_telegram_result_missing_event` |

---

## 4. Cách chạy lại

```bash
# Backend (unittest + Flask test client)
cd backend
python -m unittest discover -s tests -p "test_alert_*.py" -v

# Frontend (node:test qua tsx, không cần cài thêm gói)
cd frontend
npm test
```

Kết quả lần chạy gần nhất:

```
backend:  22 tests - OK (4.3s)
frontend: 25 tests / 25 pass / 0 fail (~0.5s)
```

> `backend/tests/test_detect_ip_bva.py` cần `numpy` + `opencv-python` + `ultralytics`
> nên không nằm trong phạm vi lần chạy này; 2 bộ test mới chỉ dùng thư viện chuẩn,
> `flask` và `unittest`.

## 5. Thay đổi mã nguồn phục vụ kiểm thử

| Thay đổi | Lý do |
|---|---|
| Tách `frontend/src/alerts.ts` | Đưa quy tắc kích hoạt, phân loại mức độ, cooldown, kiểm tra cấu hình và soạn tin nhắn ra khỏi React để test được bằng `node --test` |
| `CameraMonitorView` / `App` dùng lại module trên | Tránh trùng lặp logic, đảm bảo UI và test chạy cùng một quy tắc |
| `TelegramConfigView` hiển thị lỗi định dạng và chặn Lưu/Gửi thử khi sai | Đáp ứng yêu cầu “xử lý đúng cấu hình hợp lệ và không hợp lệ” |
| Cooldown đổi `>` → `>=` | Cooldown đúng 8 000 ms như thiết kế |
| Severity dùng chung quy tắc với backend | Nhật ký CSDL và thẻ cảnh báo không còn lệch mức độ |
