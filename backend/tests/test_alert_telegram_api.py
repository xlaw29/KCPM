"""Kiem thu API quan ly canh bao va thong bao Telegram (F60-F63, F71-F73).

Chay:
    python -m unittest backend.tests.test_alert_telegram_api -v
    # hoac
    python -m unittest discover -s backend/tests -p "test_alert_*.py" -v

Dung Flask test client voi CSDL + thu muc static tam; khong goi Telegram that
(`urllib.request.urlopen` duoc thay bang ham gia).
"""

import base64
import io
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fire_web import app as app_module  # noqa: E402
from fire_web import db  # noqa: E402


SNAPSHOT_DATA_URL = "data:image/png;base64," + base64.b64encode(
    b"fake-image-bytes-for-test"
).decode("ascii")


class FakeResponse:
    """Gia lap context manager tra ve tu urllib.request.urlopen."""

    def __init__(self, payload: dict) -> None:
        self._body = json.dumps(payload).encode("utf-8")

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *exc_info) -> bool:
        return False

    def read(self) -> bytes:
        return self._body


class AlertTelegramApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.addCleanup(self._close_db)
        tmp_path = Path(self._tmp.name)

        # Moi test co CSDL + thu muc static rieng, khong dung vao backend/data.
        real_init_db = db.init_db
        init_patcher = mock.patch.object(
            db, "init_db", lambda *args, **kwargs: real_init_db(tmp_path / "test.db")
        )
        init_patcher.start()
        self.addCleanup(init_patcher.stop)

        root_patcher = mock.patch.object(app_module, "ROOT_DIR", tmp_path)
        root_patcher.start()
        self.addCleanup(root_patcher.stop)

        self.tmp_path = tmp_path
        self.app = app_module.create_app(model_path=tmp_path / "best.pt")
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()

    # -- helpers ----------------------------------------------------------- #
    @staticmethod
    def _close_db() -> None:
        """Dong connection truoc khi xoa thu muc tam (Windows giu file .db)."""
        conn = getattr(db._local, "conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001 - chi don dep
                pass
            db._local.conn = None

    def create_detection(self, **overrides):
        payload = {
            "type": "fire",
            "confidence": 0.82,
            "camera_name": "CAM-01 (Camera máy tính)",
            "detected_classes": ["fire"],
            "box_count": 1,
            "source": "camera",
        }
        payload.update(overrides)
        return self.client.post("/api/detections", json=payload)

    def fake_urlopen(self, payload=None, error=None):
        """Thay urlopen bang ham ghi lai request; tra ve danh sach request."""
        calls = []

        def _fake(request, timeout=None):  # noqa: ANN001
            calls.append(request)
            if error is not None:
                raise error
            return FakeResponse(payload or {"ok": True, "result": {"message_id": 1}})

        patcher = mock.patch.object(app_module.urllib.request, "urlopen", _fake)
        patcher.start()
        self.addCleanup(patcher.stop)
        return calls

    # -- F60 --------------------------------------------------------------- #
    def test_f60_list_returns_full_fields_and_total(self) -> None:
        for confidence in (0.5, 0.7, 0.9):
            self.assertEqual(self.create_detection(confidence=confidence).status_code, 201)

        response = self.client.get("/api/detections")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()

        self.assertEqual(body["total"], 3)
        self.assertEqual(body["limit"], 100)
        self.assertEqual(body["offset"], 0)

        newest, _, oldest = body["detections"]
        self.assertGreater(newest["id"], oldest["id"])
        expected_fields = {
            "id", "camera_name", "type", "severity", "confidence", "detected_classes",
            "image_path", "source", "acknowledged", "acknowledged_by", "created_at",
            "telegram_status", "telegram_chat_id", "telegram_error", "telegram_sent_at",
        }
        self.assertTrue(expected_fields <= set(newest))
        self.assertEqual(newest["telegram_status"], "none")

    def test_f60b_detail_returns_event_and_404_for_unknown(self) -> None:
        detection_id = self.create_detection().get_json()["detection"]["id"]

        response = self.client.get(f"/api/detections/{detection_id}")
        self.assertEqual(response.status_code, 200)
        record = response.get_json()["detection"]
        self.assertEqual(record["id"], detection_id)
        self.assertEqual(record["camera_name"], "CAM-01 (Camera máy tính)")

        missing = self.client.get("/api/detections/999999")
        self.assertEqual(missing.status_code, 404)
        self.assertIn("error", missing.get_json())

    # -- F61 --------------------------------------------------------------- #
    def test_f61_filters_by_type_camera_ack_state_and_search(self) -> None:
        fire_id = self.create_detection(type="fire").get_json()["detection"]["id"]
        self.create_detection(
            type="smoke",
            camera_name="CAM-02 (Điện thoại IP)",
            detected_classes=["smoke"],
            confidence=0.66,
        )
        self.client.post(
            f"/api/detections/{fire_id}/acknowledge", json={"operator": "Nguyen Van A"}
        )

        self.assertEqual(self.client.get("/api/detections?type=fire").get_json()["total"], 1)
        self.assertEqual(self.client.get("/api/detections?camera=CAM-02").get_json()["total"], 1)
        self.assertEqual(
            self.client.get("/api/detections?q=Điện thoại").get_json()["total"], 1
        )
        self.assertEqual(
            self.client.get("/api/detections?severity=critical").get_json()["total"], 1
        )

        unack = self.client.get("/api/detections?acknowledged=false").get_json()
        self.assertEqual(unack["total"], 1)
        self.assertEqual(unack["detections"][0]["type"], "smoke")

        acked = self.client.get("/api/detections?acknowledged=true").get_json()
        self.assertEqual(acked["total"], 1)
        self.assertEqual(acked["detections"][0]["id"], fire_id)

    def test_f61b_pagination_keeps_total_and_limits_rows(self) -> None:
        for _ in range(3):
            self.create_detection()

        page = self.client.get("/api/detections?limit=2&offset=2").get_json()
        self.assertEqual(page["total"], 3)
        self.assertEqual(len(page["detections"]), 1)
        self.assertEqual(page["limit"], 2)
        self.assertEqual(page["offset"], 2)

        capped = self.client.get("/api/detections?limit=9999").get_json()
        self.assertEqual(capped["limit"], 500)

    # -- F62 --------------------------------------------------------------- #
    def test_f62_acknowledge_updates_state_and_operator(self) -> None:
        detection_id = self.create_detection().get_json()["detection"]["id"]

        response = self.client.post(
            f"/api/detections/{detection_id}/acknowledge",
            json={"operator": "Tran Thi B"},
        )
        self.assertEqual(response.status_code, 200)
        record = response.get_json()["detection"]
        self.assertTrue(record["acknowledged"])
        self.assertEqual(record["acknowledged_by"], "Tran Thi B")

        # Goi lai lan 2 (idempotent) van giu trang thai da xac nhan.
        again = self.client.post(f"/api/detections/{detection_id}/acknowledge", json={})
        self.assertTrue(again.get_json()["detection"]["acknowledged"])

    def test_f62b_acknowledge_unknown_event_returns_404(self) -> None:
        response = self.client.post("/api/detections/424242/acknowledge", json={"operator": "X"})
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.get_json())

    # -- F63 --------------------------------------------------------------- #
    def test_f63_create_detection_persists_fields_and_snapshot(self) -> None:
        response = self.create_detection(
            telegram_status="pending",
            image=SNAPSHOT_DATA_URL,
        )
        self.assertEqual(response.status_code, 201)
        record = response.get_json()["detection"]

        self.assertEqual(record["type"], "fire")
        self.assertEqual(record["severity"], "critical")  # fire + conf 0.82 >= 0.7
        self.assertEqual(record["confidence"], 0.82)
        self.assertEqual(record["telegram_status"], "pending")
        self.assertTrue(record["image_path"].startswith("/static/snapshots/"))
        self.assertTrue(
            (Path(app_module.ROOT_DIR) / record["image_path"].lstrip("/")).is_file()
        )

    def test_f63b_create_detection_derives_type_severity_and_sanitizes_status(self) -> None:
        response = self.create_detection(
            type=None,
            severity=None,
            confidence=0.5,
            detected_classes=["smoke"],
            telegram_status="khong-hop-le",
        )
        self.assertEqual(response.status_code, 201)
        record = response.get_json()["detection"]
        self.assertEqual(record["type"], "smoke")
        self.assertEqual(record["severity"], "medium")
        self.assertEqual(record["telegram_status"], "none")

    # -- F71 --------------------------------------------------------------- #
    def test_f71_send_telegram_requires_token_chat_and_message(self) -> None:
        missing_token = self.client.post(
            "/api/telegram/send", json={"chat_id": "1", "message": "x"}
        )
        self.assertEqual(missing_token.status_code, 400)
        self.assertIn("bot token", missing_token.get_json()["error"].lower())

        missing_chat = self.client.post(
            "/api/telegram/send", json={"bot_token": "123:abc", "message": "x"}
        )
        self.assertEqual(missing_chat.status_code, 400)
        self.assertIn("chat_id", missing_chat.get_json()["error"].lower())

        missing_message = self.client.post(
            "/api/telegram/send", json={"bot_token": "123:abc", "chat_id": "1"}
        )
        self.assertEqual(missing_message.status_code, 400)
        self.assertIn("nội dung", missing_message.get_json()["error"].lower())

    # -- F72 --------------------------------------------------------------- #
    def test_f72_send_message_without_image(self) -> None:
        calls = self.fake_urlopen(payload={"ok": True, "result": {"message_id": 7}})

        response = self.client.post(
            "/api/telegram/send",
            json={
                "bot_token": "123456:ABC",
                "chat_id": "987654",
                "message": "CẢNH BÁO KHÓI",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])
        self.assertEqual(len(calls), 1)
        self.assertTrue(calls[0].full_url.endswith("/sendMessage"))
        body = json.loads(calls[0].data.decode("utf-8"))
        self.assertEqual(body, {"chat_id": "987654", "text": "CẢNH BÁO KHÓI"})

    def test_f72b_send_photo_when_image_provided(self) -> None:
        calls = self.fake_urlopen(payload={"ok": True, "result": {"message_id": 8}})

        response = self.client.post(
            "/api/telegram/send",
            json={
                "bot_token": "123456:ABC",
                "chat_id": "987654",
                "message": "CẢNH BÁO LỬA/CHÁY",
                "image": SNAPSHOT_DATA_URL,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])
        self.assertEqual(len(calls), 1)
        request = calls[0]
        self.assertTrue(request.full_url.endswith("/sendPhoto"))
        self.assertTrue(request.headers["Content-type"].startswith("multipart/form-data; boundary="))
        self.assertIn(b'name="chat_id"', request.data)
        self.assertIn(b'name="photo"', request.data)
        self.assertIn("CẢNH BÁO LỬA/CHÁY".encode("utf-8"), request.data)
        self.assertIn(b"fake-image-bytes-for-test", request.data)

    # -- F73 --------------------------------------------------------------- #
    def test_f73_send_failure_returns_ok_false(self) -> None:
        error = urllib.error.HTTPError(
            "https://api.telegram.org/bot123/sendMessage",
            401,
            "Unauthorized",
            None,
            io.BytesIO(b'{"ok":false,"description":"Unauthorized"}'),
        )
        self.fake_urlopen(error=error)

        response = self.client.post(
            "/api/telegram/send",
            json={"bot_token": "123456:ABC", "chat_id": "987654", "message": "x"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertFalse(body["ok"])
        self.assertTrue(body["error"].startswith("HTTP 401"))

    def test_f73b_record_telegram_result_sent_and_failed(self) -> None:
        detection_id = self.create_detection(telegram_status="pending").get_json()["detection"]["id"]

        sent = self.client.post(
            f"/api/detections/{detection_id}/telegram",
            json={"ok": True, "chat_id": "987654"},
        )
        self.assertEqual(sent.status_code, 200)
        record = sent.get_json()["detection"]
        self.assertEqual(record["telegram_status"], "sent")
        self.assertEqual(record["telegram_chat_id"], "987654")
        self.assertTrue(record["telegram_sent_at"])
        self.assertIsNone(record["telegram_error"])

        failed = self.client.post(
            f"/api/detections/{detection_id}/telegram",
            json={"ok": False, "chat_id": "987654", "error": "HTTP 401: Unauthorized"},
        )
        record = failed.get_json()["detection"]
        self.assertEqual(record["telegram_status"], "failed")
        self.assertEqual(record["telegram_error"], "HTTP 401: Unauthorized")

    def test_f73c_record_telegram_result_validates_payload_and_id(self) -> None:
        detection_id = self.create_detection().get_json()["detection"]["id"]

        invalid = self.client.post(f"/api/detections/{detection_id}/telegram", json={})
        self.assertEqual(invalid.status_code, 400)

        unknown = self.client.post("/api/detections/999999/telegram", json={"ok": True})
        self.assertEqual(unknown.status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
