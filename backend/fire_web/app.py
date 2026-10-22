import json
import os
import threading
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

# Gioi han thoi gian cho khi mo camera IP (~5s) de khong treo lau neu URL sai.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "timeout;5000000")

from flask import Flask, jsonify, request, send_file
from werkzeug.utils import secure_filename

from . import db
from .detector import (
    FireDetector,
    allowed_file,
    decode_data_url,
    is_image_file,
    is_video_file,
)


ROOT_DIR = Path(__file__).resolve().parent.parent  # thu muc backend/
DEFAULT_MODEL_PATH = ROOT_DIR / "model" / "best.pt"
# Video mau de demo cho man Giam sat camera.
SAMPLE_VIDEO_PATH = ROOT_DIR / "media" / "sample.mp4"
ZALO_SEND_URL = "https://openapi.zalo.me/v3.0/oa/message/cs"
TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"

# Quan ly ket noi camera IP (dien thoai) - giu cap mo san de doc nhanh.
_ip_caps: dict[str, "object"] = {}
_ip_lock = threading.Lock()


def _read_ip_frame(url: str):
    """Doc 1 khung tu camera IP (http MJPEG / rtsp). Tra None neu loi."""
    import cv2

    with _ip_lock:
        cap = _ip_caps.get(url)
        if cap is None or not cap.isOpened():
            cap = cv2.VideoCapture(url)
            _ip_caps[url] = cap
        if not cap.isOpened():
            _ip_caps.pop(url, None)
            return None
        ok, frame = cap.read()
        if not ok:
            cap.release()
            _ip_caps.pop(url, None)
            return None
        return frame


def _encode_multipart(
    fields: dict[str, str], files: dict[str, tuple[str, bytes, str]]
) -> tuple[bytes, str]:
    """Dong goi multipart/form-data thu cong (khong can thu vien ngoai)."""
    boundary = uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body += f"--{boundary}\r\n".encode()
        body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
        body += f"{value}\r\n".encode()
    for name, (filename, data, content_type) in files.items():
        body += f"--{boundary}\r\n".encode()
        body += (
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
        ).encode()
        body += f"Content-Type: {content_type}\r\n\r\n".encode()
        body += data + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    return bytes(body), boundary


def create_app(
    model_path: str | Path = DEFAULT_MODEL_PATH,
    confidence_threshold: float = 0.45,
    imgsz: int = 1280,
) -> Flask:
    app = Flask(
        __name__,
        static_folder=str(ROOT_DIR / "static"),
    )
    app.config["MAX_CONTENT_LENGTH"] = 250 * 1024 * 1024
    detector = FireDetector(model_path, confidence_threshold, imgsz=imgsz)
    output_dir = ROOT_DIR / "static" / "outputs"
    upload_dir = ROOT_DIR / ".cache" / "uploads"
    snapshot_dir = ROOT_DIR / "static" / "snapshots"
    output_dir.mkdir(parents=True, exist_ok=True)
    upload_dir.mkdir(parents=True, exist_ok=True)
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    # Khoi tao CSDL SQLite (tao bang + seed tai khoan mac dinh neu chua co).
    db.init_db()

    def _severity_for(confidence: float, classes: list[str]) -> str:
        """Suy ra muc do nghiem trong tu do tin cay va lop phat hien."""
        if "fire" in classes and confidence >= 0.7:
            return "critical"
        if "fire" in classes:
            return "high"
        if confidence >= 0.6:
            return "high"
        return "medium"

    def _save_snapshot(image_data_url: str | None) -> str | None:
        """Luu anh snapshot (data URL) xuong dia, tra ve duong dan cong khai."""
        if not isinstance(image_data_url, str) or not image_data_url.startswith("data:image/"):
            return None
        try:
            image_bytes = decode_data_url(image_data_url)
        except ValueError:
            return None
        filename = f"snap-{uuid4().hex}.jpg"
        (snapshot_dir / filename).write_bytes(image_bytes)
        return f"/static/snapshots/{filename}"

    # Cho phep React (chay o cong khac) goi API; voi Vite proxy thi cung an toan.
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    @app.route("/api/<path:_unused>", methods=["OPTIONS"])
    def cors_preflight(_unused):
        return ("", 204)

    @app.get("/")
    def index():
        # Giao dien chinh la app React (smart-fire-monitoring, cong 3000).
        # Backend nay chi phuc vu API AI.
        return jsonify(
            {
                "service": "fire-detection-api",
                "ui": "smart-fire-monitoring (React, port 3000)",
                "endpoints": ["/api/health", "/api/detect-frame", "/api/detect-upload", "/api/media/sample", "/api/zalo/send"],
            }
        )

    @app.get("/api/media/sample")
    def sample_video():
        if not SAMPLE_VIDEO_PATH.exists():
            return jsonify({"error": "Sample video not found."}), 404
        return send_file(SAMPLE_VIDEO_PATH, mimetype="video/mp4", conditional=True)

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "ok": True,
                "model_path": str(detector.model_path),
                "model_exists": detector.model_path.exists(),
                "confidence_threshold": detector.confidence_threshold,
            }
        )

    @app.post("/api/detect-upload")
    def detect_upload():
        if "file" not in request.files:
            return jsonify({"error": "No file was uploaded."}), 400

        uploaded = request.files["file"]
        filename = secure_filename(uploaded.filename or "")
        if not filename or not allowed_file(filename):
            return jsonify({"error": "Unsupported file type."}), 400

        if is_image_file(filename):
            result = detector.detect_image_bytes(uploaded.read())
            result["result_type"] = "image"
            return jsonify(result)

        if is_video_file(filename):
            extension = filename.rsplit(".", 1)[1].lower()
            input_path = upload_dir / f"{uuid4().hex}.{extension}"
            output_filename = f"detected-{uuid4().hex}.mp4"
            output_path = output_dir / output_filename
            uploaded.save(input_path)
            try:
                result = detector.detect_video_file(input_path, output_path)
            finally:
                input_path.unlink(missing_ok=True)

            result["result_type"] = "video"
            result["video_url"] = f"/static/outputs/{output_filename}"
            result.pop("video_path", None)
            return jsonify(result)

        return jsonify({"error": "Unsupported file type."}), 400

    @app.post("/api/detect-frame")
    def detect_frame():
        payload = request.get_json(silent=True) or {}
        image_data = payload.get("image")
        if not isinstance(image_data, str):
            return jsonify({"error": "Missing image data URL."}), 400

        conf = payload.get("conf")
        conf_value = None
        if isinstance(conf, (int, float)):
            conf_value = max(0.05, min(0.95, float(conf)))

        image_bytes = decode_data_url(image_data)
        result = detector.detect_image_bytes(image_bytes, conf=conf_value)
        result["result_type"] = "image"
        return jsonify(result)

    @app.post("/api/detect-ip")
    def detect_ip():
        import cv2

        payload = request.get_json(silent=True) or {}
        url = str(payload.get("url") or "").strip()
        if not url:
            return jsonify({"error": "Thiếu URL camera IP."}), 400

        conf = payload.get("conf")
        conf_value = None
        if isinstance(conf, (int, float)):
            conf_value = max(0.05, min(0.95, float(conf)))

        frame = _read_ip_frame(url)
        if frame is None:
            return (
                jsonify(
                    {
                        "error": "Không kết nối được camera IP. Kiểm tra URL và đảm bảo điện thoại cùng wifi với máy tính."
                    }
                ),
                502,
            )

        ok, buffer = cv2.imencode(".jpg", frame)
        if not ok:
            return jsonify({"error": "Không đọc được khung hình từ camera IP."}), 500

        result = detector.detect_image_bytes(buffer.tobytes(), conf=conf_value)
        result["result_type"] = "image"
        return jsonify(result)

    @app.post("/api/zalo/send")
    def zalo_send():
        payload = request.get_json(silent=True) or {}
        access_token = str(payload.get("access_token") or "").strip()
        message = str(payload.get("message") or "").strip()
        recipients = payload.get("recipients") or []
        if not access_token:
            return jsonify({"error": "Thiếu access_token của Zalo OA."}), 400
        if not message:
            return jsonify({"error": "Thiếu nội dung tin nhắn."}), 400
        if not isinstance(recipients, list) or not recipients:
            return jsonify({"error": "Thiếu danh sách người nhận (user_id)."}), 400

        results = []
        for recipient in recipients:
            user_id = str(recipient).strip()
            body = json.dumps(
                {
                    "recipient": {"user_id": user_id},
                    "message": {"text": message},
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                ZALO_SEND_URL,
                data=body,
                method="POST",
                headers={
                    "Content-Type": "application/json",
                    "access_token": access_token,
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                ok = data.get("error", 0) == 0
                results.append(
                    {"recipient": user_id, "ok": ok, "response": data}
                )
            except urllib.error.HTTPError as exc:
                results.append(
                    {
                        "recipient": user_id,
                        "ok": False,
                        "error": f"HTTP {exc.code}: {exc.read().decode('utf-8', 'ignore')}",
                    }
                )
            except Exception as exc:  # noqa: BLE001
                results.append({"recipient": user_id, "ok": False, "error": str(exc)})

        sent = sum(1 for item in results if item.get("ok"))
        return jsonify({"sent": sent, "total": len(results), "results": results})

    @app.post("/api/telegram/send")
    def telegram_send():
        payload = request.get_json(silent=True) or {}
        bot_token = str(payload.get("bot_token") or "").strip()
        chat_id = str(payload.get("chat_id") or "").strip()
        message = str(payload.get("message") or "").strip()
        image = payload.get("image")  # tuy chon: data URL anh snapshot
        if not bot_token:
            return jsonify({"error": "Thiếu bot token Telegram."}), 400
        if not chat_id:
            return jsonify({"error": "Thiếu chat_id Telegram."}), 400
        if not message:
            return jsonify({"error": "Thiếu nội dung tin nhắn."}), 400

        try:
            if isinstance(image, str) and image.startswith("data:image/"):
                # Gui anh kem chu thich (sendPhoto, multipart)
                photo_bytes = decode_data_url(image)
                fields = {"chat_id": chat_id, "caption": message}
                files = {"photo": ("snapshot.jpg", photo_bytes, "image/jpeg")}
                body, boundary = _encode_multipart(fields, files)
                url = TELEGRAM_API.format(token=bot_token, method="sendPhoto")
                req = urllib.request.Request(
                    url,
                    data=body,
                    method="POST",
                    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
                )
            else:
                # Chi gui chu (sendMessage)
                body = json.dumps({"chat_id": chat_id, "text": message}).encode("utf-8")
                url = TELEGRAM_API.format(token=bot_token, method="sendMessage")
                req = urllib.request.Request(
                    url,
                    data=body,
                    method="POST",
                    headers={"Content-Type": "application/json"},
                )

            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return jsonify({"ok": bool(data.get("ok")), "response": data})
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")
            return jsonify({"ok": False, "error": f"HTTP {exc.code}: {detail}"}), 200
        except Exception as exc:  # noqa: BLE001
            return jsonify({"ok": False, "error": str(exc)}), 200

    # ------------------------------------------------------------------ #
    # Tai khoan (dang ky / dang nhap) - luu vao SQLite
    # ------------------------------------------------------------------ #
    @app.post("/api/auth/register")
    def auth_register():
        payload = request.get_json(silent=True) or {}
        email = str(payload.get("email") or "").strip()
        password = str(payload.get("password") or "")
        username = str(payload.get("username") or "").strip()
        full_name = str(payload.get("full_name") or "").strip()
        try:
            user = db.create_user(email, password, username=username, full_name=full_name)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"ok": True, "user": user}), 201

    @app.post("/api/auth/login")
    def auth_login():
        payload = request.get_json(silent=True) or {}
        email = str(payload.get("email") or payload.get("username") or "").strip()
        password = str(payload.get("password") or "")
        user = db.verify_user(email, password)
        if user is None:
            return jsonify({"ok": False, "error": "Sai email hoặc mật khẩu."}), 401
        return jsonify({"ok": True, "user": user})

    @app.get("/api/users")
    def list_users():
        return jsonify({"users": db.list_users()})

    # ------------------------------------------------------------------ #
    # Lich su phat hien chay/khoi - luu vao SQLite
    # ------------------------------------------------------------------ #
    @app.get("/api/detections")
    def get_detections():
        limit = request.args.get("limit", default=100, type=int)
        offset = request.args.get("offset", default=0, type=int)
        type_filter = request.args.get("type") or None
        ack_arg = request.args.get("acknowledged")
        ack = None
        if ack_arg is not None:
            ack = ack_arg.lower() in {"1", "true", "yes"}
        rows = db.list_detections(limit=limit, offset=offset, type=type_filter, acknowledged=ack)
        return jsonify({"detections": rows})

    @app.post("/api/detections")
    def create_detection():
        payload = request.get_json(silent=True) or {}
        classes = payload.get("detected_classes") or []
        if not isinstance(classes, list):
            classes = []
        det_type = str(payload.get("type") or (classes[0] if classes else "fire"))
        confidence = payload.get("confidence")
        confidence = float(confidence) if isinstance(confidence, (int, float)) else 0.0
        severity = str(payload.get("severity") or _severity_for(confidence, classes))
        image_path = _save_snapshot(payload.get("image"))
        record = db.insert_detection(
            type=det_type,
            confidence=confidence,
            camera_name=str(payload.get("camera_name") or ""),
            severity=severity,
            detected_classes=[str(c) for c in classes],
            box_count=int(payload.get("box_count") or 0),
            image_path=image_path,
            source=str(payload.get("source") or "camera"),
            user_id=payload.get("user_id"),
        )
        return jsonify({"ok": True, "detection": record}), 201

    @app.post("/api/detections/<int:detection_id>/acknowledge")
    def ack_detection(detection_id):
        payload = request.get_json(silent=True) or {}
        operator = str(payload.get("operator") or payload.get("acknowledged_by") or "")
        record = db.acknowledge_detection(detection_id, operator)
        if record is None:
            return jsonify({"error": "Không tìm thấy sự kiện."}), 404
        return jsonify({"ok": True, "detection": record})

    @app.get("/api/stats")
    def get_stats():
        return jsonify(db.detection_stats())

    @app.errorhandler(ValueError)
    def value_error(exc):
        return jsonify({"error": str(exc)}), 400

    @app.errorhandler(FileNotFoundError)
    def file_error(exc):
        return jsonify({"error": str(exc)}), 500

    @app.errorhandler(RuntimeError)
    def runtime_error(exc):
        return jsonify({"error": str(exc)}), 500

    return app
