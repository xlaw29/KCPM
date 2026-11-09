"""Kiem thu lop du lieu cho nhat ky su kien canh bao (KAN-20).

Chi dung thu vien chuan + ``fire_web.db`` nen chay duoc ma khong can cai
ultralytics/opencv (khac voi cac test nhan dien).
"""

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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


@pytest.fixture()
def db_path(tmp_path: Path) -> Path:
    path = tmp_path / "kan20.db"
    db.init_db(path)
    return path


def test_migrate_old_database_adds_telegram_columns(tmp_path: Path) -> None:
    """CSDL tao tu phien ban cu phai duoc bo sung cot Telegram khi khoi dong."""
    path = tmp_path / "old.db"
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
    assert {"telegram_status", "telegram_chat_id", "telegram_error", "telegram_sent_at"} <= columns
    rows = db.list_detections()
    assert len(rows) == 1
    assert rows[0]["telegram_status"] == "none"


def test_insert_detection_stores_pending_status(db_path: Path) -> None:
    record = db.insert_detection(
        type="fire",
        confidence=0.91,
        camera_name="CAM-01 (Camera may tinh)",
        severity="critical",
        detected_classes=["fire"],
        box_count=1,
        telegram_status="pending",
    )

    assert record["id"] > 0
    assert record["telegram_status"] == "pending"
    assert record["telegram_error"] is None
    assert record["detected_classes"] == ["fire"]


def test_insert_detection_rejects_unknown_status(db_path: Path) -> None:
    record = db.insert_detection(type="smoke", telegram_status="khong-hop-le")
    assert record["telegram_status"] == "none"


def test_record_telegram_result_sent_and_failed(db_path: Path) -> None:
    ok_record = db.insert_detection(type="fire", telegram_status="pending")
    sent = db.record_telegram_result(ok_record["id"], True, chat_id="123456")

    assert sent is not None
    assert sent["telegram_status"] == "sent"
    assert sent["telegram_chat_id"] == "123456"
    assert sent["telegram_sent_at"]
    assert sent["telegram_error"] is None

    failed_record = db.insert_detection(type="smoke", telegram_status="pending")
    failed = db.record_telegram_result(failed_record["id"], False, error="HTTP 401: Unauthorized")

    assert failed is not None
    assert failed["telegram_status"] == "failed"
    assert failed["telegram_error"] == "HTTP 401: Unauthorized"


def test_record_telegram_result_missing_event(db_path: Path) -> None:
    assert db.record_telegram_result(999_999, True) is None
    assert db.get_detection(999_999) is None


def test_list_and_count_with_filters(db_path: Path) -> None:
    db.insert_detection(type="fire", camera_name="CAM-01 (Camera may tinh)", severity="critical")
    db.insert_detection(type="smoke", camera_name="CAM-02 (Dien thoai IP)", severity="high")

    assert db.count_detections() == 2
    assert db.count_detections(type="fire") == 1
    assert db.count_detections(severity="high") == 1
    assert db.count_detections(camera="CAM-01") == 1
    assert db.count_detections(search="Dien thoai") == 1
    assert db.count_detections(search="khong-ton-tai") == 0
    assert len(db.list_detections(limit=1, offset=1)) == 1


def test_stats_include_telegram_counters(db_path: Path) -> None:
    sent = db.insert_detection(type="fire")
    failed = db.insert_detection(type="smoke")
    db.insert_detection(type="fire")
    db.record_telegram_result(sent["id"], True, chat_id="1")
    db.record_telegram_result(failed["id"], False, error="timeout")

    stats = db.detection_stats()
    assert stats["total"] == 3
    assert stats["unacknowledged"] == 3
    assert stats["by_type"] == {"fire": 2, "smoke": 1}
    assert stats["telegram_sent"] == 1
    assert stats["telegram_failed"] == 1
    assert stats["by_telegram"]["none"] == 1


def test_acknowledge_detection_updates_operator(db_path: Path) -> None:
    record = db.insert_detection(type="fire")
    updated = db.acknowledge_detection(record["id"], "Nguyen Van A")

    assert updated is not None
    assert updated["acknowledged"] is True
    assert updated["acknowledged_by"] == "Nguyen Van A"
    assert db.count_detections(acknowledged=True) == 1
    assert db.count_detections(acknowledged=False) == 0
