# Test case BVA — API nhận diện camera IP

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| Chức năng | Nhận diện cháy/khói từ camera IP (điện thoại) |
| Endpoint | `POST /api/detect-ip` |
| File xử lý | `backend/fire_web/app.py` → `detect_ip()` |
| Commit sửa lỗi | `9496c2f3` — trả `502` thay vì `200` khi không kết nối được camera |
| Bộ test tự động | `backend/tests/test_detect_ip_bva.py` |
| Công cụ | `unittest` (thư viện chuẩn Python) + Flask test client |
| Kết quả | **31/31 PASS** (27,9 giây) |

### Mục tiêu kiểm thử

1. Kiểm tra việc kiểm tra hợp lệ của `url` (bắt buộc, không rỗng sau khi `strip`).
2. Kiểm tra việc **kẹp (clamp)** `conf` vào miền `[0.05, 0.95]`.
3. Kiểm tra mã HTTP trả về đúng theo từng nhánh xử lý: `400`, `502`, `500`, `200`.
4. Đặc biệt xác nhận **lỗi đã sửa**: không kết nối được camera → `502`, không còn `200`.

---

## 2. Đặc tả chức năng

### Request

```http
POST /api/detect-ip
Content-Type: application/json

{
  "url": "http://192.168.1.10:8080/video",
  "conf": 0.25
}
```

| Trường | Kiểu | Bắt buộc | Miền giá trị |
|---|---|---|---|
| `url` | string | Có | Độ dài ≥ 1 sau khi `strip()` |
| `conf` | number | Không | Bị kẹp vào `[0.05, 0.95]`; sai kiểu → `400`; không gửi → dùng mặc định `0.45` |

### Response

| HTTP | Trường hợp | Body |
|---|---|---|
| `200` | Camera đọc được khung hình | `{result_type: "image", detections, summary}` |
| `400` | Thiếu/rỗng `url`, hoặc `conf` sai kiểu | `{"error": "..."}` |
| `500` | Đọc được khung nhưng `cv2.imencode` lỗi | `{"error": "Không đọc được khung hình từ camera IP."}` |
| `502` | Không mở được camera / không đọc được khung | `{"error": "Không kết nối được camera IP. ..."}` |

---

## 3. Phương pháp BVA áp dụng

Boundary Value Analysis chọn các giá trị **ngay tại biên** và **hai bên biên** của miền dữ liệu hợp lệ, thay vì chọn ngẫu nhiên. Với mỗi biên chọn 3 điểm: `min - 1 bước`, `min`, `min + 1 bước` (và tương tự ở biên trên), cộng thêm một giá trị danh nghĩa ở giữa miền.

### 3.1. Biến `url`

`url` là chuỗi không có giới hạn độ dài khai báo, nhưng bị **cắt khoảng trắng** rồi kiểm tra rỗng. Vì vậy miền hợp lệ là:

```
độ dài sau strip ∈ [1, +∞)
```

| Điểm | Giá trị | Ý nghĩa |
|---|---|---|
| Dưới biên dưới | `""`, `"   "`, `null`, `false`, `0` | Độ dài 0 → không hợp lệ |
| **Biên dưới** | `"a"` | Độ dài 1 → hợp lệ về hình thức, nhưng camera không tồn tại |
| Trong miền | `"http://127.0.0.1:1/video"` | URL hợp lệ, camera tắt |
| Trên (đại diện) | `"http://127.0.0.1:1/" + "a"×2000` | Chuỗi rất dài, vẫn phải xử lý an toàn |

> Do không có giới hạn trên của độ dài, không tồn tại biên `max`; test dùng giá trị rất dài để kiểm tra độ bền.

### 3.2. Biến `conf`

`conf` bị kẹp bởi `max(0.05, min(0.95, conf))` → miền hợp lệ là **đoạn đóng** `[0.05, 0.95]`. Chọn bước = `0.01` (độ chính xác 2 chữ số thập phân, tương ứng mức hiển thị phần trăm trên UI).

| Điểm | Giá trị | Kỳ vọng sau kẹp |
|---|---|---|
| Dưới biên dưới (min − 1 bước) | `0.04` | `0.05` |
| **Biên dưới** | `0.05` | `0.05` |
| Trên biên dưới (min + 1 bước) | `0.06` | `0.06` |
| Danh nghĩa (giữa miền) | `0.5` | `0.5` |
| Dưới biên trên (max − 1 bước) | `0.94` | `0.94` |
| **Biên trên** | `0.95` | `0.95` |
| Trên biên trên (max + 1 bước) | `0.96` | `0.95` |
| Ngoài miền xa | `0`, `1`, `-5`, `1 000 000` | `0.05`, `0.95`, `0.05`, `0.95` |
| Sai kiểu | `"0.5"`, `null`, `NaN` | `400` (không gọi detector) |
| Kiểu đặc biệt | `true`, `false` | `400` (bool không phải số) |
| Không gửi trường | (không có khóa `conf`) | `None` → mặc định `0.45` |

---

## 4. Bảng test case

### Nhóm 1 — Biên của `url`

| ID | Dữ liệu vào | Loại biên | HTTP kỳ vọng | Kỳ vọng khác | Kết quả |
|---|---|---|---|---|---|
| TC-01 | `{}` (không gửi `url`) | dưới biên dưới (0) | `400` | body có `error` | ✅ PASS |
| TC-02 | `{"url": ""}` | biên dưới (0 ký tự) | `400` | body có `error` | ✅ PASS |
| TC-03 | `{"url": "   "}` | 0 ký tự sau `strip` | `400` | body có `error` | ✅ PASS |
| TC-04 | `{"url": null}` | rỗng | `400` | body có `error` | ✅ PASS |
| TC-05 | `{"url": false}` | rỗng (`false or ""`) | `400` | body có `error` | ✅ PASS |
| TC-06 | `{"url": 0}` | rỗng (`0 or ""`) | `400` | body có `error` | ✅ PASS |
| TC-07 | `{"url": "a"}` | **biên dưới hợp lệ** (1 ký tự) | `502` | không mở được camera | ✅ PASS |
| TC-08 | `{"url": "http://127.0.0.1:1/video"}` | trong miền, camera tắt | **`502`** | `error` chứa "Không kết nối được camera IP" | ✅ PASS |
| TC-09 | `{"url": "http://127.0.0.1:1/" + "a"×2000}` | chuỗi rất dài | `502` | không crash | ✅ PASS |
| TC-10 | `{"url": 123}` | sai kiểu → `"123"` | `502` | không crash | ✅ PASS |

### Nhóm 2 — Biên của `conf` (miền `[0.05, 0.95]`)

Các case dùng camera giả + detector giả để quan sát chính xác giá trị `conf` mà handler truyền xuống `detect_image_bytes()`.

| ID | `conf` | Loại biên | `conf` kỳ vọng nhận được | HTTP | Kết quả |
|---|---|---|---|---|---|
| TC-11 | `0.04` | min − 1 bước | `0.05` | `200` | ✅ PASS |
| TC-12 | `0.05` | **min** | `0.05` | `200` | ✅ PASS |
| TC-13 | `0.06` | min + 1 bước | `0.06` | `200` | ✅ PASS |
| TC-14 | `0.5` | danh nghĩa | `0.5` | `200` | ✅ PASS |
| TC-15 | `0.94` | max − 1 bước | `0.94` | `200` | ✅ PASS |
| TC-16 | `0.95` | **max** | `0.95` | `200` | ✅ PASS |
| TC-17 | `0.96` | max + 1 bước | `0.95` | `200` | ✅ PASS |
| TC-18 | `0` | ngoài miền dưới | `0.05` | `200` | ✅ PASS |
| TC-19 | `1` | ngoài miền trên | `0.95` | `200` | ✅ PASS |
| TC-20 | `-5` | âm | `0.05` | `200` | ✅ PASS |
| TC-21 | `1 000 000` | rất lớn | `0.95` | `200` | ✅ PASS |
| TC-22 | `"0.5"` | sai kiểu (chuỗi) | — | `400` | ✅ PASS |
| TC-23 | `null` | null tường minh | — | `400` | ✅ PASS |
| TC-24 | `true` | bool (không phải số) | — | `400` | ✅ PASS |
| TC-25 | `false` | bool (không phải số) | — | `400` | ✅ PASS |
| TC-26 | `NaN` | không hữu hạn | — | `400` | ✅ PASS |
| TC-27 | *(không gửi)* | thiếu trường | `None` (mặc định `0.45`) | `200` | ✅ PASS |

### Nhóm 3 — Chuyển trạng thái HTTP (lỗi đã sửa)

| ID | Tình huống | HTTP kỳ vọng | Kỳ vọng khác | Kết quả |
|---|---|---|---|---|
| TC-28 | Camera đọc được khung nhưng `cv2.imencode` lỗi | `500` | body có `error` | ✅ PASS |
| TC-29 | Camera hoạt động bình thường | `200` | `result_type == "image"` | ✅ PASS |

### Nhóm 4 — Cùng quy tắc cho `POST /api/detect-frame`

`detect-frame` dùng chung hàm kiểm tra `conf` nên hành vi phải giống `detect-ip`.

| ID | Tình huống | HTTP kỳ vọng | Kỳ vọng khác | Kết quả |
|---|---|---|---|---|
| TC-30 | `conf = "0.5"` | `400` | body có `error` | ✅ PASS |
| TC-31 | `conf = 0.04` | `200` | detector nhận `0.05` | ✅ PASS |

---

## 5. Kết quả thực thi

```
Ran 31 tests in 27.908s

OK
```

- **31/31 test PASS**, không có test nào fail hay error.
- TC-07, TC-08, TC-09, TC-10 thực sự gọi `cv2.VideoCapture` tới `127.0.0.1:1` nên FFmpeg in log `Connection to tcp://127.0.0.1:1 failed` ra stderr — đây là log mong đợi, không phải lỗi test.
- TC-11 → TC-27 và TC-29 → TC-31 dùng `unittest.mock` thay camera/detector thật để kết quả **xác định (deterministic)**, chạy được cả trên CI không có camera.

---

## 6. Cách chạy lại

Không cần cài thêm thư viện (chỉ dùng `unittest` của Python chuẩn):

```powershell
backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Chạy một test cụ thể:

```powershell
backend\.venv\Scripts\python.exe backend\tests\test_detect_ip_bva.py DetectIpBvaTest.test_tc08_url_khong_ket_noi_duoc -v
```

---

## 7. Ghi chú và hạn chế

1. **TC-29 (200)** dùng camera giả (`_read_ip_frame` được mock) nên chỉ xác nhận luồng xử lý, không xác nhận chất lượng ảnh thật. Cần bổ sung kiểm thử thủ công với điện thoại thật (ứng dụng IP Webcam) để kiểm tra end-to-end.
2. **`conf` sai kiểu** (`"0.5"`, `null`, `true`/`false`, `NaN`) giờ trả `400` qua hàm dùng chung `_parse_conf()` trong `backend/fire_web/app.py`, áp dụng cho cả `/api/detect-ip` và `/api/detect-frame`. Giá trị **số** nằm ngoài miền vẫn được **kẹp** về `0.05`/`0.95` (không trả `400`) — đây là chủ đích để UI gửi ngưỡng nào cũng hợp lệ. Không gửi trường `conf` thì dùng mặc định `0.45`.
3. **`url` không có giới hạn độ dài** trong đặc tả, nên không có test biên trên thực sự; TC-09 chỉ kiểm tra độ bền với chuỗi dài.
4. Các test chạy tuần tự và dùng chung một Flask app (`setUpClass`) để tránh nạp lại cấu hình nhiều lần.
5. Bộ test không phụ thuộc model YOLO thật ở nhóm 2 và 3 (detector được mock), nên chạy nhanh và ổn định trên máy CI.
