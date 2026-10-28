# Qodana — Kiểm tra chất lượng mã nguồn

[Qodana](https://www.jetbrains.com/qodana/) là công cụ static analysis của JetBrains
(dùng chính bộ inspection của PyCharm/WebStorm). Mỗi lần push/PR, Qodana quét code và
báo: lỗi tiềm ẩn, code chết, import thừa, cảnh báo bảo mật, code smell…

## Đã thêm những gì

| File | Mục đích |
|---|---|
| `.github/workflows/qodana.yml` | Workflow GitHub Actions, chạy khi push/PR vào `main` |
| `qodana-backend.yaml` | Cấu hình linter Python (backend) — **Community, miễn phí** |
| `qodana-frontend.yaml` | Cấu hình linter JS/TS (frontend) — cần license Ultimate |
| `docs/qodana.md` | Tài liệu này |

## Cách hoạt động

Workflow chạy 2 job song song:

```
push / pull_request / workflow_dispatch
        │
        ├── Qodana · Backend (Python)   → quét backend/
        │       linter: qodana-python-community:2026.2   (miễn phí)
        │
        └── Qodana · Frontend (JS/TS)   → quét frontend/
                linter: qodana-js:2026.2                (cần Ultimate)
                ↳ chỉ chạy khi biến QODANA_JS_ENABLED = true
```

- `--only-directory backend` / `frontend`: chỉ phân tích đúng thư mục đó.
- `bootstrap`: cài dependency trước khi quét để Qodana hiểu import.
  Backend cố ý **không** cài full `requirements.txt` (tránh tải PyTorch ~1 GB mỗi lần
  chạy); chỉ cài `flask`, `numpy`, `opencv-python-headless` và `ultralytics --no-deps`
  — đủ để resolve import.
- `exclude`: bỏ qua `dataset/`, `test-media/`, `backend/model/`, `backend/data/`,
  `node_modules/`, `__pycache__`, `.venv`…

## Xem kết quả

1. Vào tab **Actions** → chọn workflow **Qodana** → chọn lần chạy.
2. **Artifacts**: tải `qodana-backend` để lấy `qodana.sarif.json` + báo cáo HTML (`report/`).
3. **Annotations**: lỗi được gắn trực tiếp vào dòng code trong tab **Files changed** của PR.
4. **Qodana Cloud** (tuỳ chọn): thêm secret `QODANA_TOKEN_BACKEND` để đẩy báo cáo lên
   [qodana.cloud](https://qodana.cloud) và xem dashboard/history.

> Mặc định **không có quality gate**, nên workflow vẫn xanh dù có cảnh báo.
> Muốn chặn merge khi có quá nhiều lỗi, xem mục *Quality gate* bên dưới.

## Miễn phí hay trả phí?

| Linter | Ngôn ngữ | License |
|---|---|---|
| `qodana-python-community` | Python | **Community — miễn phí** |
| `qodana-js` | JavaScript / TypeScript | Ultimate (trả phí, có trial 30 ngày) |

Vì vậy mặc định chỉ job **backend** chạy. Job frontend đã cấu hình sẵn nhưng bị tắt.

## Bật job frontend

1. Tạo project trên [Qodana Cloud](https://qodana.cloud) (chọn license Ultimate/trial).
2. Copy **project token**.
3. Trên GitHub repo → **Settings → Secrets and variables → Actions**:
   - Tab **Secrets** → `New repository secret`: `QODANA_TOKEN_FRONTEND` = token vừa copy.
   - Tab **Variables** → `New repository variable`: `QODANA_JS_ENABLED` = `true`.
4. Push lại (hoặc bấm **Run workflow**) — job `Qodana · Frontend (JS/TS)` sẽ xuất hiện.

## Chạy Qodana trên máy

Cần **Docker Desktop** đang chạy.

```powershell
# Cài Qodana CLI (Windows)
winget install -e --id JetBrains.QodanaCLI

# Quét backend
qodana scan --only-directory backend --config qodana-backend.yaml

# Quét frontend (cần token Ultimate)
$env:QODANA_TOKEN="<token>"
qodana scan --only-directory frontend --config qodana-frontend.yaml

# Mở báo cáo HTML của lần quét gần nhất
qodana show
```

Kết quả tạm nằm trong `.qodana/` (đã thêm vào `.gitignore`).

## Quality gate (chặn merge khi code kém chất lượng)

Thêm `--fail-threshold <N>` vào `args` trong workflow: workflow fail khi số vấn đề **vượt quá N**.

```yaml
with:
  args: --only-directory backend --config qodana-backend.yaml --fail-threshold 50
```

Khuyến nghị đi kèm **baseline**: commit file `qodana.sarif.json` của lần chạy đầu tiên
làm mốc, rồi thêm `--baseline qodana.sarif.json`. Khi đó chỉ các vấn đề **mới** bị tính,
nợ kỹ thuật cũ không làm đỏ CI.

```yaml
with:
  args: --only-directory backend --config qodana-backend.yaml --baseline qodana.sarif.json --fail-threshold 0
```

## Lưu ý

- Version linter trong `qodana-*.yaml` phải khớp major version với action
  (`2026.2` ↔ `JetBrains/qodana-action@v2026.2`). Nâng cấp thì sửa cả hai.
- `permissions` của workflow cần `checks: write` + `pull-requests: write` để Qodana
  gắn annotation và comment lên PR.
- Qodana chỉ **đọc** code, không chạy code dự án; `bootstrap` chỉ cài thư viện.
- Qodana mặc định có thể dùng language level Python cũ và báo sai (`Invalid type annotation`)
  với cú pháp `str | Path`, `dict[str, Any]`… Workflow đã đặt `QODANA_PYTHON_PATH` trỏ tới
  Python 3.12 của container để tránh false positive này. Khi chạy local bằng Docker, thêm:
  `qodana scan ... -e QODANA_PYTHON_PATH=/opt/miniconda3/bin/python3`.
- Nếu repo dùng hết quota GitHub Actions, có thể tạm tắt workflow trong tab **Actions**.
