"""Kiem thu lop du lieu cho nhat ky su kien canh bao (KAN-20).

Chay:
    python -m unittest backend.tests.test_alert_events_db -v
    # hoac
    python -m unittest discover -s backend/tests -p "test_alert_*.py" -v

Chi dung thu vien chuan + ``fire_web.db`` nen chay duoc ma khong can cai
ultralytics/opencv (khac voi cac test nhan dien).
"""

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fire_web import db  # noqa: E402


OLD_SCHEMA = """
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    username      TEXT,
    full_name     TEXT,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'operator',
    created_at    TEXT NOT NULL,
    last_login_at TEXT
);
CREATE TABLE detections (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    camera_name      TEXT NOT NULL DEFAULT '',
    type             TEXT NOT NULL,
    severity         TEXT NOT NULL DEFAULT 'medium',
    confidence       REAL NOT NULL DEFAULT 0,
    detected_classes TEXT NOT NULL DEFAULT '',
    box_count        INTEGER NOT NULL DEFAULT 0,
    image_path       TEXT,
    source           TEXT NOT NULL DEFAULT 'camera',
    acknowledged     INTEGER NOT NULL DEFAULT 0,
    acknowledged_by  TEXT,
    created_at       TEXT NOT NULL
);
"""


class AlertEventsDbTest(unittest.TestCase):
    """Moi test chay tren mot CSDL tam rieng."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.addCleanup(self._close_db)
        self.db_path = Path(self._tmp.name) / "kan20.db"
        db.init_db(self.db_path)

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

    # -- F63 --------------------------------------------------------------- #
    def test_insert_detection_stores_pending_status(self) -> None:
        record = db.insert_detection(
            type="fire",
            confidence=0.91,
            camera_name="CAM-01 (Camera may tinh)",
            severity="critical",
            detected_classes=["fire"],
            box_count=1,
            telegram_status="pending",
        )

        self.assertGreater(record["id"], 0)
        self.assertEqual(record["telegram_status"], "pending")
        self.assertIsNone(record["telegram_error"])
        self.assertEqual(record["detected_classes"], ["fire"])

    def test_insert_detection_rejects_unknown_status(self) -> None:
        record = db.insert_detection(type="smoke", telegram_status="khong-hop-le")
        self.assertEqual(record["telegram_status"], "none")

    def test_migrate_old_database_adds_telegram_columns(self) -> None:
        """CSDL tao tu phien ban cu phai duoc bo sung cot Telegram khi khoi dong."""
        path = Path(self._tmp.name) / "old.db"
        conn = sqlite3.connect(path)
        conn.executescript(OLD_SCHEMA)
        conn.execute(
            "INSERT INTO detections (camera_name, type, confidence, created_at)"
            " VALUES ('CAM-01', 'fire', 0.8, '2026-01-01T00:00:00+00:00')"
        )
        conn.commit()
        conn.close()

        db.init_db(path)

        columns = {row["name"] for row in db._connect().execute("PRAGMA table_info(detections)")}
        self.assertTrue(
            {"telegram_status", "telegram_chat_id", "telegram_error", "telegram_sent_at"}
            <= columns
        )
        rows = db.list_detections()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["telegram_status"], "none")

    # -- F73 --------------------------------------------------------------- #
    def test_record_telegram_result_sent_and_failed(self) -> None:
        ok_record = db.insert_detection(type="fire", telegram_status="pending")
        sent = db.record_telegram_result(ok_record["id"], True, chat_id="123456")

        self.assertIsNotNone(sent)
        self.assertEqual(sent["telegram_status"], "sent")
        self.assertEqual(sent["telegram_chat_id"], "123456")
        self.assertTrue(sent["telegram_sent_at"])
        self.assertIsNone(sent["telegram_error"])

        failed_record = db.insert_detection(type="smoke", telegram_status="pending")
        failed = db.record_telegram_result(
            failed_record["id"], False, error="HTTP 401: Unauthorized"
        )

        self.assertIsNotNone(failed)
        self.assertEqual(failed["telegram_status"], "failed")
        self.assertEqual(failed["telegram_error"], "HTTP 401: Unauthorized")

    def test_record_telegram_result_missing_event(self) -> None:
        self.assertIsNone(db.record_telegram_result(999_999, True))
        self.assertIsNone(db.get_detection(999_999))

    # -- F61 --------------------------------------------------------------- #
    def test_list_and_count_with_filters(self) -> None:
        db.insert_detection(
            type="fire", camera_name="CAM-01 (Camera may tinh)", severity="critical"
        )
        db.insert_detection(
            type="smoke", camera_name="CAM-02 (Dien thoai IP)", severity="high"
        )

        self.assertEqual(db.count_detections(), 2)
        self.assertEqual(db.count_detections(type="fire"), 1)
        self.assertEqual(db.count_detections(severity="high"), 1)
        self.assertEqual(db.count_detections(camera="CAM-01"), 1)
        self.assertEqual(db.count_detections(search="Dien thoai"), 1)
        self.assertEqual(db.count_detections(search="khong-ton-tai"), 0)
        self.assertEqual(len(db.list_detections(limit=1, offset=1)), 1)

    # -- F60 --------------------------------------------------------------- #
    def test_stats_include_telegram_counters(self) -> None:
        sent = db.insert_detection(type="fire")
        failed = db.insert_detection(type="smoke")
        db.insert_detection(type="fire")
        db.record_telegram_result(sent["id"], True, chat_id="1")
        db.record_telegram_result(failed["id"], False, error="timeout")

        stats = db.detection_stats()
        self.assertEqual(stats["total"], 3)
        self.assertEqual(stats["unacknowledged"], 3)
        self.assertEqual(stats["by_type"], {"fire": 2, "smoke": 1})
        self.assertEqual(stats["telegram_sent"], 1)
        self.assertEqual(stats["telegram_failed"], 1)
        self.assertEqual(stats["by_telegram"]["none"], 1)

    # -- F62 --------------------------------------------------------------- #
    def test_acknowledge_detection_updates_operator(self) -> None:
        record = db.insert_detection(type="fire")
        updated = db.acknowledge_detection(record["id"], "Nguyen Van A")

        self.assertIsNotNone(updated)
        self.assertTrue(updated["acknowledged"])
        self.assertEqual(updated["acknowledged_by"], "Nguyen Van A")
        self.assertEqual(db.count_detections(acknowledged=True), 1)
        self.assertEqual(db.count_detections(acknowledged=False), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
